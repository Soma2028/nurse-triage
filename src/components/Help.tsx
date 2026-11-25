import type { ReactNode } from 'react'
import { TRIAGE_STYLE } from '../constants'
import type { Triage } from '../types'
import { formatHours } from '../utils/format'

/*
 * せっていの「ヘルプ」から開く説明。
 * 書き方の決まり：1項目は「見出し＋その下に短い説明」。コロンで定義を並べない。1文に1つのことだけ。
 * 計算式は書かない（README に任せる）。本文は濃い文字で読みやすく。
 */

/** 見出しと、その下の説明 */
function Item({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <div className="text-sm leading-6 text-ink">{children}</div>
    </div>
  )
}

/** 区切られたまとまり（見出しは小さなラベル） */
function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      {label && <h2 className="text-xs font-bold tracking-wide text-ink-muted">{label}</h2>}
      {children}
    </section>
  )
}

const TAGS: { triage: Triage; text: string }[] = [
  { triage: 'black', text: '締切を過ぎた課題。遅れて出すか、先生に連絡するかを決めよう。' },
  { triage: 'red', text: '締切まで24時間を切った課題。または、時間がほとんど残っていない課題。' },
  { triage: 'yellow', text: '締切まで3日以内の課題。または、時間に余裕があまりない課題。' },
  { triage: 'green', text: '今のペースで間に合う課題。' },
]

/** 優先度の決め方（せっていのヘルプ） */
export function PriorityHelp() {
  return (
    <div className="flex flex-col gap-8">
      <Group label="色の決め方">
        <p className="text-sm leading-6 text-ink">
          残りの作業時間と、締切までに使える時間をくらべて色を決めているよ。
        </p>
        <ul className="flex flex-col gap-3">
          {TAGS.map(({ triage, text }) => (
            <li key={triage} className="flex items-start gap-3">
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${TRIAGE_STYLE[triage].tag}`}
              >
                {TRIAGE_STYLE[triage].name}
              </span>
              <span className="text-sm leading-6 text-ink">{text}</span>
            </li>
          ))}
        </ul>
      </Group>

      <Group label="ほかにも知っておくこと">
        <Item title="ほかの課題と合わせると足りないとき">
          1件ずつなら間に合っても、締切の早い課題と合わせると時間が足りないことがあるよ。そのときも赤にして、画面の上で知らせるよ。
        </Item>
        <Item title="並び順">
          黒・赤・黄・緑の順。同じ色の中では、追い込まれている課題と、実習記録・看護過程が上に来るよ。
        </Item>
        <Item title="今日のプラン">上の課題から順に、今日の時間を30分ずつ割り振っているよ。</Item>
      </Group>
    </div>
  )
}

/** ホームの見方（せっていのヘルプ。優先度の決め方は別の切り替え） */
export function HomeHelp() {
  return (
    <div className="flex flex-col gap-8">
      <Group>
        <Item title="つぎにやる">
          まずやる課題。黒・赤・黄色の課題を、やる順に5件まで並べているよ。横になぞると次の課題が見られるよ。押すとくわしく見られるよ。
        </Item>
        <Item title="今日のプラン">今日の時間を、どの課題に何時間使うか。</Item>
        <Item title="ほかの急ぎ">今日のプランに入りきらなかった、黒と赤の課題。</Item>
        <Item title="キャラクターの横の「○人ががんばってるよ」">
          今日、課題を1つ以上終わらせたフレンドの数だよ。押すとフレンドの様子が見られるよ。ログインしてフレンドがいるときだけ出るよ。
        </Item>
        <Item title="日付の横の「今日は実習日」">
          今日使える時間が、その日の予定で決まっているよ。休みの日は「今日は休み」と出るよ。
        </Item>
      </Group>
    </div>
  )
}

/** データの扱い（せっていのヘルプ）。何を端末に置き、何をサーバーに送るか。README の「サーバーに送るもの」と合わせる */
export function PrivacyHelp() {
  return (
    <div className="flex flex-col gap-8">
      <Group label="この iPhone の中だけ">
        <Item title="課題">
          課題名・種類・締切・見込み時間・進み具合は、この端末の中だけに保存しているよ。アプリを消すと、課題も消えるよ。
        </Item>
        <Item title="カレンダーと使える時間">
          実習・休み・テストの予定と、1日に使える時間も、端末の中だけだよ。
        </Item>
      </Group>

      <Group label="サーバーに送るもの">
        <Item title="通知をオンにしたとき">
          課題の締切・種類・終わったかどうかだけ送るよ。課題名は、「通知に課題名を出す」をオンにしたときだけ送るよ。課題名に患者さんのことを書いているなら、オフのままにしてね。
        </Item>
        <Item title="ログインしたとき">
          ログインに使うメールアドレスは、Clerk
          というログインのサービスが預かるよ。プロフィールの、ニックネーム・アイコンか小さくした写真・学年・ひとことをサーバーに置くよ。
        </Item>
        <Item title="フレンドに見せるもの">
          今日終わらせた課題の数と、いまの赤の数だけだよ。課題名や中身は送らないよ。フレンドの「追加と設定」で「フレンドに見せる」をオフにすると、サーバーの分も消えるよ。
        </Item>
      </Group>

      <Group label="消したいとき">
        <Item title="通知をやめる">
          せっていの通知のスイッチをオフにすると、サーバーにあるこの端末の締切などのデータもまとめて消えるよ。
        </Item>
        <Item title="退会する">
          せっていのアカウントから退会すると、プロフィール・フレンド・申請・応援・進み具合をサーバーからまとめて消して、ログインのアカウントも消すよ。端末の課題はそのまま残るよ。
        </Item>
      </Group>
    </div>
  )
}

/** カレンダーの使い方（せっていのヘルプ） */
export function CalendarHelp({
  hoursPractice,
  hoursNormal,
}: {
  hoursPractice: number
  hoursNormal: number
}) {
  const rows: [string, string][] = [
    ['実習の日', formatHours(hoursPractice)],
    ['印のない日', formatHours(hoursNormal)],
    ['テストの日', formatHours(hoursNormal)],
    ['休みの日', '0h'],
  ]
  return (
    <div className="flex flex-col gap-8">
      <Group label="予定の入れ方">
        <Item title="実習や休みの期間">右下の＋から、始まりと終わりの日を選んで入れてね。</Item>
        <Item title="テストの日">右下の＋で「テスト」を選んで、その日を入れてね。</Item>
        <Item title="1日だけ変えたいとき">
          日付をタップして、「実習」「休み」「テスト」「なし」から選んでね。
        </Item>
        <Item title="月を変える">
          表を左右になぞると、前や次の月に移るよ。上の「年月」を押すと、好きな月を選べるよ。
        </Item>
        <Item title="課題の締切">
          課題の締切の日には、色の点と課題名が出るよ。日付をタップすると、その日の課題を直したり、追加したりできるよ。
        </Item>
      </Group>

      <Group label="1日に使える時間">
        <p className="text-sm leading-6 text-ink">印に合わせて、締切までに使える時間を数えるよ。</p>
        <dl className="ui-card divide-y divide-line overflow-hidden rounded-2xl">
          {rows.map(([k, v]) => (
            <div key={k} className="flex min-h-11 items-center justify-between px-4 text-sm">
              <dt className="text-ink">{k}</dt>
              <dd className="font-bold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-ink-muted">時間はせっていで変えられるよ。</p>
      </Group>

      <Group label="実習中のスイッチ">
        <p className="text-sm leading-6 text-ink">今日が実習の日なら、自動でオンになるよ。</p>
      </Group>
    </div>
  )
}
