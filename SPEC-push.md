# 看護課題トリアージ 通知機能 指示書（SPEC-push）

締切が近い課題を、iPhone／Android／PC に Web プッシュ通知で知らせる。
既存の `SPEC.md` と `CLAUDE.md` の方針（ローカル優先・日本語コメント・段階ごとにコミット）はそのまま守る。

## 1. 方針

- **ローカル優先**：画面は今まで通り localStorage から表示する。サーバーへの同期は裏で行い、失敗しても画面は止めない
- **ログインは作らない**：端末ごとにランダムな deviceId と secret を作って localStorage に保存し、それで端末を見分ける
- **サーバーに送るのは通知に必要な最小限だけ**：課題ID・種類・締切・完了かどうか。課題名は、初期設定では送らない（実習記録や関連図の課題名には患者の情報（「A氏・心不全」など）が入りやすく、実習の守秘義務に関わるため）
- **すべて無料枠**：Vercel Hobby（Functions）＋ Neon Free（Postgres）＋ cron-job.org（定期実行）

## 2. 構成

```
iPhone等（ホーム画面のWebアプリ）
  ├─ service worker（push を受けて通知を出す）
  └─ 課題が変わるたびに /api/sync へ送る（裏で・まとめて）
Vercel Functions（/api）
  ├─ /api/subscribe   通知の宛先を登録・解除
  ├─ /api/sync        通知に必要な課題データを丸ごと置き換え
  ├─ /api/test        テスト通知を1件送る
  ├─ /api/vapid-key   VAPID の公開鍵を返す（アプリはここから取る）
  └─ /api/cron/notify 15分ごとに呼ばれ、送るべき通知を送る
Neon（Postgres）
cron-job.org → 15分ごとに /api/cron/notify を叩く（Vercel Hobby の cron は1日1回までなので使わない）
```

- ライブラリ：web-push（VAPID）、@neondatabase/serverless
- Vercel Functions の地域は、Neon の DB と同じか一番近い地域にそろえる

## 3. 環境変数（Vercel に設定。リポジトリには絶対に入れない）

| 名前                                     | 内容                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                           | Neon の接続文字列                                                       |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` で作る                               |
| `VAPID_SUBJECT`                          | `mailto:自分のアドレス`                                                 |
| `CRON_SECRET`                            | ランダムな長い文字列。cron-job.org からのリクエストのヘッダーで照合する |

`.env.example` に名前だけ書き、`.env*` は `.gitignore` に入れる。

## 4. DB（migrations/001_init.sql）

```sql
create table devices (
  id uuid primary key,
  secret_hash text not null,          -- secret の SHA-256
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table subscriptions (
  endpoint text primary key,
  device_id uuid not null references devices(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create table reminders (
  device_id uuid not null references devices(id) on delete cascade,
  task_id text not null,
  type text not null,
  title text,                          -- 「課題名を通知に出す」がONのときだけ入る
  due timestamptz not null,
  done boolean not null default false,
  primary key (device_id, task_id)
);
create table sent (
  device_id uuid not null,
  task_id text not null,
  kind text not null,                  -- 'eve' | 'h3' | 'morning'
  due timestamptz not null,            -- 締切が変わったら送り直せるようにキーに含める
  sent_at timestamptz not null default now(),
  primary key (device_id, task_id, kind, due)
);
```

## 5. 通知のルール（api/\_lib/schedule.ts、純粋関数）

| kind      | タイミング（初期値）                                      | 設定の項目・選べる値                               | 文面の例                                 |
| --------- | --------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| `eve`     | 締切の前日 20:00（日本時間）                              | `eveTime`：0:00〜23:45 の15分刻み（0:00 からの分） | 「明日 8:30 締切：実習記録」             |
| `h3`      | 締切の3時間前                                             | `h3Lead`：30・60・120・180・240・360・720 分前     | 「あと3時間：看護過程」                  |
| `morning` | 毎日 7:00、未完了で赤の課題があるとき（端末ごとに1日1回） | `morningTime`：0:00〜23:45 の15分刻み              | 「今日の赤タッグ 2件。まず実習記録から」 |

- 設定は `{ eve, eveTime, h3, h3Lead, morning, morningTime, showTitle }`。時刻の項目は、なければ初期値で補う（時刻を選べるようになる前のアプリ・DB の設定のため）。`h3` は最初3時間前で固定だった名残りの名前で、sent の kind もそのまま
- 時刻は15分刻み（cron が15分おきのため）
- まとめの sent の due は、その日（日本時間）の 0:00。時刻を変えても同じ日に二度送らない。夜おそい時刻で送りどきが日付をまたぐときは、前の日の分として扱う

- 時刻はすべて Asia/Tokyo で計算する（Vercel のサーバーは UTC で動くため）。`Intl.DateTimeFormat` か固定の +9 時間で日本時間に直し、前日20時などを求める
- cron は15分おきなので、「予定時刻 ≤ 現在 < 予定時刻 + 60分」かつ sent にまだないものを送る（取りこぼし防止）
- 送ったら sent に記録する。同じ通知を二度送らない
- 完了済み・期限切れの課題には送らない
- 課題名を送らない設定のときは、種類名で表示する（例：「実習記録」「看護過程」）
- 朝のまとめの「赤」の判定は、サーバーでは簡易版（24時間以内の締切 or 期限切れでない未完了の rec/proc）でよい。端末側の判定とずれてもよいことを README に書く
- push サービスから 404 / 410 が返ったら、その subscription を削除する
- 通知をタップしたらアプリを開く（notificationclick で `clients.openWindow('/')`）

## 6. API

subscribe・sync・test 共通：deviceId と secret を受け取り、secret_hash と照合する。合わなければ 401。入力は zod で検証する。

- `POST /api/subscribe { deviceId, secret, subscription, settings }`：初回は devices を作成。subscription を upsert
- `DELETE /api/subscribe { deviceId, secret, endpoint }`
- `POST /api/sync { deviceId, secret, tasks: [{ id, type, due, done, title? }], settings }`：その端末の reminders を丸ごと置き換える（トランザクション）。上限は200件
- `POST /api/test { deviceId, secret }`：その端末の全 subscription にテスト通知を送る
- `GET /api/vapid-key`：`VAPID_PUBLIC_KEY` を `{ publicKey }` で返す（公開してよい値なので照合なし）。アプリは公開鍵をビルドに埋め込まず、常にここから取る
- `GET /api/cron/notify`：`Authorization: Bearer ${CRON_SECRET}` が合わなければ 401。送った件数・失敗件数を JSON で返す

## 7. フロント

**manifest と service worker**

- `public/manifest.webmanifest`：`display: "standalone"`、name・short_name・アイコン（180/192/512）、背景色は生成り色。iOS でプッシュ通知を受けるにはこれが必要
- `public/sw.js`：push（通知を表示）と notificationclick だけの小さな手書きにする。キャッシュはしない（古い画面が残る事故を防ぐ）
- `main.tsx` で service worker を登録する

**同期（src/sync/）**

- 課題・設定が変わったら、2秒デバウンスして /api/sync に送る。失敗したら次の変更のときか、アプリを開いたときに再送する
- 通知を ON にしていない端末は同期しない（サーバーにデータを置かない）

**設定UI（右カラムに「通知」パネル）**

状態に応じて表示を変える。

- iPhone で、ホーム画面から開いていない（`navigator.standalone` が false）：「ホーム画面に追加すると通知を受け取れます」と、共有メニューからの追加手順を出す
- 通知に対応していない端末：その旨を出す
- 未設定：「通知を受け取る」ボタン。許可のダイアログは、このボタンのタップから出す（iOS の決まり）
- 許可済み：ON/OFF、「テスト通知を送る」、タイミングのチェックと時刻の選択（締切の前の日／締切の少し前／赤の課題のまとめ。それぞれの行の右に時刻のセレクト。チェックを外すとセレクトは押せない）
- 拒否済み：「設定アプリ → 通知 から許可してください」
- 「通知に課題名を出す」チェック（初期は OFF）。横に「患者さんの情報（イニシャル・病名など）を課題名に入れている場合はOFFのままにしてください」と書く
- 「通知をやめる」で subscription を解除し、サーバーの端末データ（devices 行ごと）も消す

## 8. テスト

Vitest（TZ=Asia/Tokyo 固定のままでよいが、サーバー側の時刻計算は TZ=UTC でも同じ結果になることを確かめるテストを置く）

- 前日20時：締切が 0:30・8:30・23:59 の場合、月末・年末をまたぐ場合
- 3時間前、朝7時
- 選んだ時刻・何時間前で送る。時刻のない古い設定は初期値で読む。まとめは時刻を変えても1日1回、夜おそい時刻は日付をまたいでも送る
- 送るべき判定：予定時刻ちょうど・59分後は送る、60分後・送信済み・完了済み・期限切れは送らない
- 締切を変えたら送り直す
- 課題名なしの文面
- API の入力検証と secret の照合（DB はモックでよい）
- 手動：Chrome（PC）でテスト通知 → iPhone のホーム画面から開いてテスト通知 → 締切を5分後などにした課題で、実際に cron から届くこと

## 9. 進め方（段階ごとにコミット。push は各段階の確認後）

1. manifest・service worker・アイコン。ホーム画面に追加して standalone で開けることを確認
2. `api/_lib/schedule.ts`（通知のルール）とテスト
3. DB のマイグレーション、`api/_lib/db.ts`、`/api/subscribe` `/api/sync` `/api/test`
4. フロントの通知パネルと同期
5. `/api/cron/notify`
6. README に、環境変数・Neon・cron-job.org の設定手順と、通知の仕組みの図を書く

1が終わったら一度止める。環境変数と Neon の準備は人間がやるので、3の前に「必要なもの」を一覧で示して待つこと。

## 10. 完成の条件

- `npm run test` / `npm run lint` / `npm run build` が警告なしで通る
- iPhone のホーム画面から開いて「通知を受け取る」→ テスト通知が届く
- 締切を近くにした課題で、前日20時・3時間前の通知が実際に届き、二度は届かない
- 課題を完了にすると、その課題の通知が来なくなる
- 「通知に課題名を出す」が OFF のとき、DB の reminders.title が空である
- サーバーが落ちていても、アプリの表示と操作は今まで通りできる
