# 看護課題トリアージ 指示書（SPEC）

看護学生向けの、課題の優先順位を出すWebアプリ。
課題を「締切・残りの作業量・使える時間」から評価し、トリアージタッグのように **赤・黄・緑** で並べる。

---

## 1. 目的と想定ユーザー

- 対象：看護学部・看護学校の学生（特に実習期間中）
- 困りごと：実習記録・看護過程・事前学習・技術試験・定期試験・国試対策が同時に来て、何から手をつけるか決められない
- ゴール：開いた瞬間に「いま何をやるか」「今日何時間ずつやるか」「このままだと間に合わない課題はどれか」がわかる

## 2. 技術構成

- React + Vite + TypeScript
- Tailwind CSS
- 状態管理：React の useReducer + Context（外部ライブラリなし）
- 保存：localStorage（バックエンドなし）
- テスト：Vitest（優先度ロジックは必ずテストを書く）
- デプロイ：Vercel
- リポジトリ：`~/dev/nurse-triage`

## 3. ディレクトリ構成

```
src/
  main.tsx
  App.tsx
  types.ts            # 型定義
  constants.ts        # 課題の種類プリセット
  logic/
    priority.ts       # 優先度計算（純粋関数のみ）
    priority.test.ts
    plan.ts           # 今日のプラン割り振り
    plan.test.ts
  store/
    reducer.ts
    storage.ts        # localStorage の読み書き（try/catch）
    sample.ts         # サンプル課題
  components/
    Header.tsx        # タイトル・設定・集計
    OverloadWarning.tsx
    TaskCard.tsx
    TaskList.tsx
    TodayPlan.tsx
    TaskForm.tsx
    DoneList.tsx
    HowItWorks.tsx
    UndoToast.tsx
  utils/
    format.ts         # 日付・時間の表示
```

## 4. データモデル（types.ts）

```ts
type TaskType =
  | "rec" | "proc" | "pre" | "osce" | "exam"
  | "report" | "gw" | "kokushi" | "etc";

interface Task {
  id: string;            // crypto.randomUUID()
  title: string;
  type: TaskType;
  due: number;           // 締切（epoch ms）
  estHours: number;      // 見込み時間（0.5刻み）
  progress: number;      // 0〜100（10刻み）
  importance: 1 | 2 | 3; // 低・中・高（成績・単位への影響）
  doneAt?: number;       // 完了日時
}

interface Settings {
  practiceMode: boolean;   // 実習期間中か
  hoursPractice: number;   // 実習中の1日の作業時間（初期値 2.5）
  hoursNormal: number;     // 通常期の1日の作業時間（初期値 4）
}

type Triage = "red" | "yellow" | "green";
```

## 5. 課題の種類プリセット（constants.ts）

| key | 表示名 | 重み w | 見込み時間の初期値 |
|---|---|---|---|
| rec | 実習記録 | 1.5 | 2h |
| proc | 看護過程（アセスメント・関連図・計画） | 1.4 | 5h |
| pre | 実習前の事前学習 | 1.3 | 5h |
| osce | 技術試験・OSCE練習 | 1.25 | 3h |
| exam | 定期試験・小テスト | 1.2 | 8h |
| report | レポート | 1.0 | 4h |
| gw | グループワーク | 1.0 | 2h |
| kokushi | 国試対策 | 0.9 | 6h |
| etc | その他 | 0.8 | 1h |

フォームで種類を変えたら、見込み時間を初期値で埋める（ユーザーが手で変えた後は上書きしない）。

## 6. 優先度ロジック（logic/priority.ts）★最重要

純粋関数 `analyse(tasks, settings, now): Analysed[]` として実装する。

```
H        = practiceMode ? hoursPractice : hoursNormal
ms       = due - now
days     = ms / 1日
remain   = estHours × (1 - progress/100)          # 残り作業時間
avail    = max(0, days) × H                       # 締切までに使える時間
ratio    = remain / max(avail, 0.1)               # 逼迫度
w        = 種類の重み（実習中は rec と proc に +0.2）
imp      = {1: 0.8, 2: 1.0, 3: 1.25}[importance]
score    = (0.6 × min(ratio, 2)/2 + 0.4 × 1/(1 + max(days, 0))) × w × imp × 100
```

**締切順の積み上げ（時間不足の判定）**
- 未完了の課題を締切の早い順に並べ、remain を累積する
- `shortage = max(0, 累積remain − その課題のavail)`
- 他の課題と合わせると間に合わない課題を検出するため。1件ずつの ratio だけでは見落とす

**トリアージ判定**
- 赤「期限切れ」：ms < 0
- 赤「今すぐ」：shortage > 0.25h または ratio ≥ 0.7 または 締切まで24時間未満
- 黄「早めに着手」：ratio ≥ 0.3 または 締切まで3日以内
- 緑「計画的に」：それ以外

**並び順**：赤 → 黄 → 緑、同じ色の中は score の高い順。

## 7. 今日のプラン（logic/plan.ts）

- 今日の作業時間 H を、並び順の上から割り振る
- 1件あたり `min(remain, 残りH)`、0.5h単位で丸める（最小0.5h）
- 余った時間は「空き：休む・復習にあてる」と表示する
- 横長の積み上げバー（タッグ色）と「1.5h 実習記録」形式のリストで表示する

## 8. 画面

**ヘッダー（紺の帯）**
- タイトル「看護課題トリアージ」と一行説明
- 実習期間中トグル、1日に使える時間（モードごとに別の値を保存）
- 集計3つ：赤タッグの件数／残り作業の合計h／今日使える時間h
- 時間不足の警告：締切が最も早い不足課題について「締切順に積み上げると『○○』の締切までに約2h足りません」

**左：優先順位リスト（TaskCard）**
- 左端にトリアージタッグ（色・順位番号・ラベル・紐穴の丸）
- 課題名／種類・締切「11/24(火) 8:30」・残り時間「あと14時間」「あと3日」・重要度
- 進捗バー
- 根拠の一行：「進捗20%・残り約1.6h ／ 締切までに使える時間 約0.8h・他の課題と合わせて0.8h不足（赤字）」
- ボタン：進捗+25%（100%で自動完了）／完了／編集／削除

**右：今日のプラン → 課題フォーム → 優先度の決め方（折りたたみ）**
- フォーム：課題名、種類、締切（datetime-local）、見込み時間、進捗スライダー、重要度（低・中・高のセグメント）
- 編集中は見出しを「課題を編集」、ボタンを「保存する」にして、キャンセルを出す
- 「優先度の決め方」の中に「サンプルに戻す」「すべて消す」

**下：完了した課題（折りたたみ）**。「戻す」で未完了に戻す。

**トースト**：完了・削除・全消去のあと5秒間「元に戻す」を出す（直前の状態を1つ保持）。

## 9. デザイン

- 地は白、ヘッダーは紺 `#1d3f6e`、タッグ色は赤 `#d92d20`／黄 `#e3a600`（文字は濃色）／緑 `#178a4a`
- フォント：見出し Zen Kaku Gothic New（700/900）、本文 Noto Sans JP
- ダークモード対応（`prefers-color-scheme`）
- 860px以下は1カラム（ヘッダー → リスト → プラン → フォーム）。360px幅で横スクロールが出ないこと
- ボタンなどのタップ領域は44px以上。入力欄は16px（iOSでズームさせない）
- 絵文字アイコンは使わない

## 10. 保存

- キー `nurse-triage-v1` に `{ tasks, done, settings }` を保存する
- 読み書きは try/catch で囲み、失敗してもアプリは動くこと
- データがないときはサンプル課題で始める（締切は「今日から○日後」で生成）

**サンプル課題**
| 課題 | 種類 | 締切 | 見込み | 進捗 | 重要度 |
|---|---|---|---|---|---|
| 実習記録（3日目） | rec | 明日 8:30 | 2h | 20% | 高 |
| 関連図の修正（A氏・心不全） | proc | 3日後 8:30 | 5h | 30% | 高 |
| 基礎看護技術 採血の技術試験練習 | osce | 5日後 13:00 | 3h | 0% | 中 |
| 小児看護学実習の事前学習 | pre | 6日後 17:00 | 6h | 0% | 中 |
| 看護倫理レポート（2000字） | report | 9日後 23:59 | 4h | 0% | 中 |
| 成人看護学 定期試験 | exam | 12日後 9:00 | 12h | 10% | 高 |
| 国試 必修問題 過去問1年分 | kokushi | 30日後 23:00 | 8h | 25% | 低 |

## 11. テスト（Vitest）

`now` を固定して以下を確認する。
- 締切が過ぎた課題は赤「期限切れ」
- 24時間以内の課題は赤
- 単体では間に合うが、締切の早い課題と合わせると足りない課題に shortage > 0 が付き、赤になる
- 実習モードを切り替えると rec / proc の score が上がる
- 進捗100%の課題は remain = 0
- plan：合計が H を超えない、0.5h単位、余りが正しい

## 12. 進め方（この順で、各段階でコミット）

1. Vite + React + TS + Tailwind の雛形、ESLint・Prettier、Vitest
2. `types.ts` `constants.ts` `logic/priority.ts` `logic/plan.ts` とテスト（UIより先に、テストが通るまで）
3. reducer・storage・サンプルデータ
4. コンポーネント（リスト → フォーム → プラン → ヘッダー集計・警告 → 完了一覧・トースト）
5. レスポンシブとダークモードの確認
6. README（目的・スクリーンショット・優先度の決め方・起動方法）
7. Vercel にデプロイ

## 13. 完成の条件

- `npm run test` がすべて通る
- `npm run build` が警告なしで通る
- リロードしても課題と設定が残る
- 360px幅とPC幅の両方で崩れない
- 実習モードの切り替えと1日の作業時間の変更が、並び順・プラン・警告にすぐ反映される

## 14. やらないこと（MVPの範囲外）

- ログイン・クラウド同期
- 通知
- 時間割や実習スケジュールの取り込み
（どれも将来の拡張候補。README に「今後やりたいこと」として書く）
