import { TRIAGE_STYLE } from '../constants'
import type { Triage } from '../types'

const TAGS: { triage: Triage; text: string }[] = [
  {
    triage: 'black',
    text: '締切を過ぎた。いちばん上に出すので、遅れて出すか、先生に連絡するかを決めよう',
  },
  {
    triage: 'red',
    text: '24時間を切った・使える時間の7割以上が必要・ほかの課題と合わせると間に合わない',
  },
  { triage: 'yellow', text: '締切まで3日以内、または使える時間の3割以上が必要' },
  { triage: 'green', text: 'それ以外。計画的に進めれば間に合う' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  )
}

/** 優先度の決め方（せってい・ホーム・課題の「？」から開くシートの中身） */
export function PriorityHelp() {
  return (
    <div className="flex flex-col gap-4 text-sm text-ink-muted">
      <Section title="色の決め方">
        <p>
          課題ごとに<b className="text-ink">残りの作業時間</b>と、締切までに
          <b className="text-ink">使える時間</b>
          をくらべて、どれくらい追い込まれているかを出しているよ。
        </p>
        <ul className="flex flex-col gap-2">
          {TAGS.map(({ triage, text }) => (
            <li key={triage} className="flex gap-2">
              <span
                className={`h-6 shrink-0 rounded-full px-2 text-xs leading-6 font-bold ${TRIAGE_STYLE[triage].tag}`}
              >
                {TRIAGE_STYLE[triage].name}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="ほかの課題と合わせると足りない">
        <p>
          締切の早い順に残りの作業を積み上げて、その締切までに使える時間を超えた分。1件ずつなら間に合うのに、まとめると足りない課題に気づけるよ。
        </p>
      </Section>
      <Section title="並び順">
        <p>
          黒 → 赤 → 黄 →
          緑。同じ色の中は、追い込まれ具合と締切の近さに、種類の重み（実習記録と看護過程は重め。実習中はさらに重く）と成績・単位への影響を掛けた点数の順。
        </p>
      </Section>
      <Section title="今日のプラン">
        <p>今日使える時間を、上の課題から0.5hずつ割り振ったものだよ。</p>
      </Section>
    </div>
  )
}

/** ホームの「？」：ホームの見方と、優先度の決め方 */
export function HomeHelp() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2 text-sm text-ink-muted">
        <li>
          <b className="text-ink">上の1行</b>
          ：締切過ぎと赤の件数、今日使える時間。日付の横は、今日の時間の理由（実習日・休み）
        </li>
        <li>
          <b className="text-ink">つぎにやる</b>：黒・赤の課題のうち、いちばん上の1件
        </li>
        <li>
          <b className="text-ink">今日のプラン</b>：今日の時間を、どの課題に何時間使うか
        </li>
        <li>
          <b className="text-ink">ほかの急ぎ</b>：今日のプランに入りきらなかった黒・赤の課題
        </li>
      </ul>
      <PriorityHelp />
    </div>
  )
}
