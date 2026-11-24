# CLAUDE.md

看護学生向けの課題トリアージ Web アプリ。仕様の正本は `SPEC.md`（通知機能は `SPEC-push.md`）、使い方・優先度の式は `README.md`。
ここには、それらに書ききれない「決めた方針」と「いまの状態」をまとめる。

## 進め方

- 作業は段階に分け、段階ごとにコミットする（メッセージは日本語、`feat:` `style:` `docs:` などの接頭辞）
- `main` に push すると Vercel に自動でデプロイされる（公開版 <https://nurse-triage-amber.vercel.app>）
- 新しい画面はローカルで確認したあと、ユーザーが実機の iPhone で確かめる
- 画面や仕様を変えたら `SPEC.md` と `README.md` も合わせて直す
- 完成の条件：`npm run test` と `npm run lint` が通り、`npm run build` が警告なしで通る。360px 幅で横スクロールが出ない

## 見た目の方針（夢のタネ寄り）

「AI っぽい見た目」をなくすため、ユーザーのアプリ「夢のタネ」（`~/dev/yumetane/web`、`~/dev/yumetane/docs/design.md`）と同じ作り方にそろえている。迷ったら夢のタネを見る。

- Tailwind の初期値の色（slate・sky など）を使わない。色は `src/index.css` の `@theme` のトークンだけ
  - 生成り `#fbf8f3`＋ドットの背景、炭色の文字、差し色は紺 `#1d3f6e`
  - タッグの黒・赤・黄・緑は判定の意味を持つので、タッグ以外に使わない（差し色に緑・朱色を選ばなかったのもこのため）。黒（締切過ぎ）は文字の炭色より一段黒い `#1a1714`
- **ライトのみ。ダークモードには対応しない**（一度対応したが、やめた）
- 色を持つのはトリアージのタッグだけ。紺はボタン・選択中だけ。「超過」「足りない」は赤い文字にせず太字の炭色（危険色は入力の誤りと「すべて消す」だけ）。カレンダーの今日は炭色の枠
- 余白は4の倍数だけ（4・8・12・16・24・32）。文字は 22（`text-title`）・16・14・12px の4段階だけ
- 部品は共通クラス（`ui-card` `ui-input` `ui-label`）と共通の部品（`ScreenLayout` `Sheet` `TaskRow` `TaskDetailSheet` `Segmented`、行の一覧は `Group` `Row` `LinkRow` `Picker` `HoursStepper`）で1通りずつ。似た部品を新しく作らない
- 動きは `src/motion.ts` の値だけを使う（0.3秒・16px・ease-out、押すと97%）
- アイコンは lucide-react。絵文字アイコンは使わない
- 文言はやわらかい話し言葉（「〜しよう」「〜だよ」）。カッコ書きの補足や説明っぽい文を増やさない
- 数字を並べたダッシュボード風のカードや、同じ形のカードの羅列にしない
- ページ全体はスクロールしない。見出しと下のタブは固定し、真ん中だけが動く（`ScreenLayout`）。iPhone 15（393×852）と SE（375×667）で、どのタブも `document.scrollHeight` が画面の高さと同じことを確かめる
- タブは ホーム／課題／カレンダー／せってい。ホームは今日やることだけ（つぎにやる・今日のプラン・ほかの急ぎ）。861px 以上は左にメニュー、中身は1列
- 追加・編集・期間で塗る・もう一度たずねる確認は、下からせり上がるシート（`Sheet`）。画面にフォームや長い説明文を常に置かない（説明はせっていの「ヘルプ」から。各画面の見出しに「？」は置かない）
- せっていは一覧（行だけ）と、行から開くページに分ける（使える時間・通知・ヘルプ・フレンド・アカウント）。ページは `ScreenLayout` の `onBack` で見出しの左に「‹」、切り替えは `motion.ts` の `pageSlide`。行は `LinkRow`（左に色なしのアイコンの枠）
- 「実習中」の切り替えはせっていだけ。ホームの日付の横に「今日は実習日」「今日は休み」「今日はテスト」を小さく出す
- タップ領域は44px以上、入力欄は16px（iOS でズームさせない）
- iPhone のホーム画面から開いたとき、上端に白いもやを出さない：iOS 26 は時計の帯の下をぼかし、上端に固定された不透明な要素があるときだけその色で塗る。`index.css` の `body::before`（safe-area の高さの固定の帯。`pointer-events: none` を付けると Safari が見つけられない）と、`ScreenLayout` の見出しの `sticky top-0` を外さない。見出しに半透明・ぼかし・影を使わない
- 縦向きだけで使う。Android は manifest の `orientation: portrait` で固定される。iPhone は固定できないので、横向きのスマホ（`landscape-phone` の variant：横向き・高さ 500px 以下・指で操作）のときだけ `RotateNotice` が画面全体に「縦にして使ってね」を出す。横から縦に戻したときにページ全体がずれたまま残らないよう、`viewportFix.ts` が向き・大きさが変わるたびにずれを 0 に戻す（viewport は `maximum-scale=1` で自動の拡大をさせない）
- 長押しで文字選択・iPhone のメニューを出さない（`index.css` で全体に `user-select: none`・`-webkit-touch-callout: none`。入力欄だけ戻す。画像は `pointer-events: none` でタップを外側に渡す）

## キャラクター（いまは仮）

- キャラクターは、空いた画面（課題がない・黒と赤がないホームなど）と、完了のトーストにだけ出す（吹き出しで話しかけるのはやめた）
- 絵は**仮の SVG**（丸い体にナースキャップ。十字は使わない）。`src/components/Chara.tsx` の `Placeholder`
- 本番の絵はユーザーが自分で用意する。`src/assets/chara/{normal,worry,happy}.png`（透過・正方形 512px）を置けば自動で差し替わる。手順は `src/assets/chara/README.md`
- 絵を勝手に描き起こしたり、別のキャラクターに変えたりしない

## アプリのアイコン（いまは仮）

- `public/favicon.svg` と `public/apple-touch-icon.png`（180×180、生成り色の背景）は、仮キャラクターの「ふつうの顔」
- `normal.png` が届いたら、この2つも同じ絵に差し替える。ホーム画面用は透過にせず生成り色で塗る（iOS は透過部分を黒くする）

## 実習スケジュール機能（実装済み）

- カレンダーのタブで、TimeTree のように実習・休み・テストの予定と課題の締切を月の表に出す。右下の＋で期間（実習・休み・テスト）や課題を追加、日付をタップでその日のシート（予定の変更・続いている期間をまとめて外す・その日の締切の課題）。表を左右になぞると前後の月に移る
- テストの日は、タッグの色とまぎれないよう塗らずに点線の枠と「試」で見せる。使える時間はふだんと同じ
- 計算は `src/logic/schedule.ts`。今日以降に印があれば、締切までに使える時間を日ごとに合計する（実習日＝実習中の時間、印なし・テスト＝ふだんの時間、休み＝0h）
- 今日が実習日なら「実習中」を自動で ON。スイッチで今日だけ手動で切り替えられる（`settings.practiceOverride`、翌日には自動に戻る）
- 今日以降に印がないときは、従来どおり `max(0, days) × H` で、スイッチも手動
- 保存は `nurse-triage-v1` の `schedule`（キーはローカル時刻の `YYYY-MM-DD`）。60日より前の印は読み込み時に消す
- 日付の境界はローカル時刻の0時。テストは `TZ=Asia/Tokyo` で動かす（`npm run test` に設定済み）

## 通知機能（作っている途中）

- `SPEC-push.md` の段階どおりに進める。段階6（README）まで済み。cron-job.org は15分おきに動いている。テーブルは Neon（iad1）に作成済み
- service worker（`public/sw.js`）は push と notificationclick だけ。キャッシュはしない
- 課題名はサーバーに送らないのが初期設定（課題名に患者の情報が入りやすいため）
- 環境変数・Neon・cron-job.org の準備はユーザーがやる。段階3の前に必要なものを示して待つ
- セキュリティのヘッダー（CSP・X-Frame-Options など）は `vercel.json` にある。CSP は自分のアプリと Clerk（`cosmic-chow-5908.clerk.accounts.dev`・`*.protect.clerk.com`・`img.clerk.com`）と Cloudflare のロボット対策だけを許す。Clerk を本番のインスタンスに切り替えたら、CSP の Clerk の場所も直す。外のサイトの読み込みを足すときも CSP を直す
- 秘密の値（`.env*`）はリポジトリに入れない
- VAPID の公開鍵は、アプリが `/api/vapid-key` から取る（フロント用の環境変数は使わない）

## ログイン・フレンド（実装済み）

- `SPEC-social.md` の段階1〜8はすべて済み（ログイン・プロフィール・フレンド・招待リンクと QR・今日の進み具合・応援）。テーブルは `migrations/002_social.sql` と `003_blocks.sql`（どちらも実行済み）
- API の回数制限は `api/_lib/rateLimit.ts`（決まりは `LIMITS`）。数えられないときは通す（アプリを止めない）。新しい API を足すときは、ここで回数を決める
- 新しいテーブル・列が要る変更では、SQL を `migrations/` に足し、ユーザーに実行してもらう。**実行し忘れても読み込みが止まらないようにする**：`socialDb.ts` の `Schema` に足し、ないときは「ないもの」として読む（写真なし・0件など）。ないものを使う操作は `NotReadyError`（503・`not_ready`）で断る。`socialDb.pglite.test.ts` に、その SQL をまだ実行していないときのテストも足す
- 招待リンクは `vercel.json` の rewrite で index.html を返し、`main.tsx` の `takeInviteFromUrl` でコードを取り出してアドレスを `/` に戻す。`InviteSheet` は Clerk を使うので、招待から開いたときだけ読み込む
- 進み具合は `ProgressSync`（Clerk を使うので必要なときだけ読み込む）が、変わったら2秒まとめて `/api/progress` に送る。送るのは日付と数だけ。見せるのをやめるとサーバーの分も消す
- 応援はフレンドにだけ、同じ相手に1日（日本時間）3回まで。相手の端末に通知で届けるため、`DeviceLink` が通知の端末（devices.user_id）にログインした人を付け、ログアウトの前に外す。通知の文面に課題のことは書かない
- QR は `qrcode-generator` で SVG を作る（白地に炭色・まわりに4マスの余白）
- Clerk の公開キーは `/api/config` から取り、localStorage に置いて次の起動からすぐ使う。Clerk は大きいので、`SocialRoot` と `AccountGroups` を別のファイルに分けて必要なときだけ読み込む（main の JS を 500kB 未満に保つ）
- プロフィールはログインしなくても作れる（`localProfile.ts`、端末の中だけ）。ログイン中は `useMyProfile`（`/api/profile`）がもとで、端末の分をそろえる。写真は端末で 128px の JPEG に縮めた data URL（`photo.ts`）を profiles.photo に置く。`Avatar` は写真があれば写真、なければ絵
- 自分のプロフィールは `useMyProfile`（`/api/profile`）。localStorage にも置き、次に開いたときに読み込みを待たずに出す。ログインした直後でプロフィールがなければ、作るシートを開く
- サーバーは `Authorization: Bearer <Clerk のセッショントークン>` を `api/_lib/identity.ts` で確かめる。退会は DB のデータを先に消してから Clerk のアカウントを消す
- ログインは Clerk のメールの6桁コード。画面は Clerk の既製の部品を使わず自前のシートで作る
- プロフィールとフレンドはせっていの中だけに置く（下のタブは増やさない）

## やらないこと（いまのところ）

- 課題のクラウド同期、時間割や .ics の取り込み（README の「今後やりたいこと」）
- ログインはプロフィール・フレンドのためだけに使う（`SPEC-social.md`）。課題名・課題の中身はサーバーに送らない
- 「サンプルに戻す」ボタン（なくした）
