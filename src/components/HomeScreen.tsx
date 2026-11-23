import { motion } from 'framer-motion'
import { useState } from 'react'
import { TRIAGE_STYLE } from '../constants'
import type { HomeView } from '../logic/home'
import { enter } from '../motion'
import type { Analysed, Plan } from '../types'
import { formatHours } from '../utils/format'
import { Chara } from './Chara'
import { HomeHelp } from './Help'
import { OverloadWarning } from './OverloadWarning'
import { HelpButton, ScreenLayout } from './ScreenLayout'
import { Sheet } from './Sheet'
import { TaskCard } from './TaskCard'
import { TodayPlan } from './TodayPlan'

interface Props {
  /** 見出しの日付（「11/24(火)」） */
  date: string
  /** 今日使える時間の理由（「今日は実習日」「今日は休み」） */
  dayNote: string | null
  analysed: Analysed[]
  view: HomeView
  plan: Plan
  redCount: number
  /** 締切過ぎ（黒）の件数。赤には含めない */
  blackCount: number
  shortage: Analysed | undefined
  onAdvance: (id: string) => void
  onComplete: (id: string) => void
  onAdd: () => void
}

/** 見出しの下の1行：締切過ぎ・赤の件数（0件は出さない）と、今日使える時間 */
function Summary({
  blackCount,
  redCount,
  hours,
}: {
  blackCount: number
  redCount: number
  hours: number
}) {
  return (
    <p
      className="flex items-center gap-4 overflow-hidden text-sm whitespace-nowrap text-ink-muted"
      aria-label="まとめ"
    >
      {blackCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className={`size-2 rounded-full ${TRIAGE_STYLE.black.dot}`} />
          締切過ぎ <b className="text-ink tabular-nums">{blackCount}</b>
        </span>
      )}
      {redCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className={`size-2 rounded-full ${TRIAGE_STYLE.red.dot}`} />赤{' '}
          <b className="text-ink tabular-nums">{redCount}</b>
        </span>
      )}
      <span>
        今日 <b className="text-ink tabular-nums">{formatHours(hours)}</b>
      </span>
    </p>
  )
}

/** 空いたところに出すキャラクターとひとこと */
function Empty({ mood, lines }: { mood: 'happy' | 'normal'; lines: [string, string] }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl px-2 py-4">
      <Chara mood={mood} size={64} />
      <p className="text-sm text-ink-muted">
        <b className="block text-base text-ink">{lines[0]}</b>
        {lines[1]}
      </p>
    </div>
  )
}

const label = 'text-xs font-bold tracking-wide text-ink-muted'

/**
 * ホーム。今日やることだけ（つぎにやる1件・今日のプラン・ほかの急ぎ）。
 * 開いて3秒で「次に何をやるか」がわかるように、上から順に読めば済む形にする。
 */
export function HomeScreen({
  date,
  dayNote,
  analysed,
  view,
  plan,
  redCount,
  blackCount,
  shortage,
  onAdvance,
  onComplete,
  onAdd,
}: Props) {
  const [help, setHelp] = useState(false)
  // ほかの急ぎで開いているカード（同時に開くのは1枚）
  const [openId, setOpenId] = useState<string | null>(null)
  const { next, urgent } = view

  return (
    <ScreenLayout
      title={date}
      note={dayNote}
      aside={<HelpButton label="ホームの見方" onClick={() => setHelp(true)} />}
      sub={<Summary blackCount={blackCount} redCount={redCount} hours={plan.hours} />}
      onAdd={onAdd}
    >
      <div className="flex flex-col gap-4">
        <OverloadWarning a={shortage} />

        {analysed.length === 0 ? (
          <Empty
            mood="happy"
            lines={['課題はぜんぶ片づいたよ。', '新しい課題は右下の＋から追加してね。']}
          />
        ) : next ? (
          <motion.section
            aria-labelledby="next-heading"
            className="flex flex-col gap-2"
            {...enter(0)}
          >
            <h2 id="next-heading" className={label}>
              つぎにやる
            </h2>
            <TaskCard
              a={next}
              rank={analysed.indexOf(next) + 1}
              open
              onAdvance={() => onAdvance(next.task.id)}
              onComplete={() => onComplete(next.task.id)}
            />
          </motion.section>
        ) : (
          <Empty mood="normal" lines={['急ぎの課題はないよ。', '今日のプランを進めよう。']} />
        )}

        {analysed.length > 0 && (
          <motion.div {...enter(0.08)}>
            <TodayPlan plan={plan} />
          </motion.div>
        )}

        {urgent.length > 0 && (
          <section aria-labelledby="urgent-heading" className="flex flex-col gap-2">
            <h2 id="urgent-heading" className={label}>
              ほかの急ぎ
            </h2>
            <ol className="flex flex-col gap-2">
              {urgent.map((a) => (
                <li key={a.task.id}>
                  <TaskCard
                    a={a}
                    rank={analysed.indexOf(a) + 1}
                    open={openId === a.task.id}
                    onToggle={() => setOpenId(openId === a.task.id ? null : a.task.id)}
                    onAdvance={() => onAdvance(a.task.id)}
                    onComplete={() => onComplete(a.task.id)}
                  />
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <Sheet open={help} title="ホームの見方" onClose={() => setHelp(false)}>
        <HomeHelp />
      </Sheet>
    </ScreenLayout>
  )
}
