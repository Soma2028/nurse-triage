import type { ReactNode } from 'react'
import { TRIAGE_STYLE } from '../constants'
import type { Triage } from '../types'
import { formatHours } from '../utils/format'

/*
 * 「？」から開く説明。
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

/** 優先度の決め方（課題・せっていの「？」、ホームの「？」の後半） */
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
                className={`w-10 shrink-0 rounded-full text-center text-xs leading-6 font-bold ${TRIAGE_STYLE[triage].tag}`}
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

/** ホームの「？」：ホームの見方と、優先度の決め方 */
export function HomeHelp() {
  return (
    <div className="flex flex-col gap-8">
      {/* シートの見出しが「ホームの見方」なので、ここにはラベルを付けない */}
      <Group>
        <Item title="つぎにやる">まずやる1件。黒か赤の課題から選んでいるよ。</Item>
        <Item title="今日のプラン">今日の時間を、どの課題に何時間使うか。</Item>
        <Item title="ほかの急ぎ">今日のプランに入りきらなかった、黒と赤の課題。</Item>
        <Item title="日付の横の「今日は実習日」">
          今日使える時間が、その日の予定で決まっているよ。休みの日は「今日は休み」と出るよ。
        </Item>
      </Group>
      <PriorityHelp />
    </div>
  )
}

/** カレンダーの「？」 */
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
    ['休みの日', '0h'],
  ]
  return (
    <div className="flex flex-col gap-8">
      <Group label="印の付け方">
        <p className="text-sm leading-6 text-ink">
          上で「実習」か「休み」を選んでから、日付をタップしてね。同じ印をもう一度タップすると外れるよ。
        </p>
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
