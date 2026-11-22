import { motion } from 'framer-motion'
import { ChevronRight, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { TRIAGE_STYLE } from '../constants'
import { enter } from '../motion'
import type { Analysed, Plan } from '../types'
import { formatHours, formatRemaining } from '../utils/format'
import { OverloadWarning } from './OverloadWarning'
import { PracticeSwitch } from './PracticeSwitch'
import { TaskCard } from './TaskCard'
import { TodayPlan } from './TodayPlan'

interface Props {
  analysed: Analysed[]
  plan: Plan
  practice: boolean
  practiceNote: string | null
  shortage: Analysed | undefined
  redCount: number
  remainTotal: number
  /** キャラクターと吹き出し（段階3で入る） */
  greeting?: ReactNode
  onTogglePractice: () => void
  onAdvance: (id: string) => void
  onComplete: (id: string) => void
  onAdd: () => void
  onOpenTasks: () => void
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted">
      {children}
    </span>
  )
}

/** ホーム。スマホでは1画面に収める（いまやる1件・今日のプラン・追加ボタン） */
export function HomeScreen({
  analysed,
  plan,
  practice,
  practiceNote,
  shortage,
  redCount,
  remainTotal,
  greeting,
  onTogglePractice,
  onAdvance,
  onComplete,
  onAdd,
  onOpenTasks,
}: Props) {
  const top = analysed[0]
  const rest = analysed.slice(1, 6)

  return (
    <div className="grid grid-cols-1 gap-3 two:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] two:gap-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-muted wide:hidden">看護課題トリアージ</p>
          <h1 className="ui-page-title hidden wide:block">ホーム</h1>
          <PracticeSwitch on={practice} note={practiceNote} onToggle={onTogglePractice} />
        </div>

        {greeting ?? <OverloadWarning a={shortage} />}

        <motion.section aria-labelledby="now-heading" {...enter(0)}>
          <h2 id="now-heading" className="ui-section-label mb-1.5">
            いまやること
          </h2>
          {top ? (
            <TaskCard
              a={top}
              rank={1}
              compact
              className="ui-card-raised"
              onAdvance={() => onAdvance(top.task.id)}
              onComplete={() => onComplete(top.task.id)}
            />
          ) : (
            <div className="ui-card p-5 text-sm text-ink-muted">
              まだ課題がないよ。下のボタンから追加してね。
            </div>
          )}
        </motion.section>

        <motion.div {...enter(0.08)}>
          <TodayPlan plan={plan} limit={3} />
        </motion.div>

        <div className="flex flex-wrap gap-2" aria-label="まとめ">
          <Pill>
            <span aria-hidden className={`size-2 rounded-full ${TRIAGE_STYLE.red.dot}`} />赤
            <b className="text-ink tabular-nums">{redCount}</b>件
          </Pill>
          <Pill>
            残り<b className="text-ink tabular-nums">{formatHours(remainTotal)}</b>
          </Pill>
          <Pill>
            今日<b className="text-ink tabular-nums">{formatHours(plan.hours)}</b>
          </Pill>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-13 items-center justify-center gap-1.5 rounded-full bg-primary text-base font-bold text-on-primary shadow-sm transition hover:bg-primary-strong wide:hidden"
        >
          <Plus aria-hidden className="size-5" strokeWidth={2.5} />
          課題を追加する
        </button>
      </div>

      {/* PC だけ：右に優先順位の上位 */}
      <section aria-labelledby="next-heading" className="hidden min-w-0 two:block">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 id="next-heading" className="ui-section-label">
            そのあとは
          </h2>
          <button
            type="button"
            onClick={onOpenTasks}
            className="inline-flex min-h-11 items-center gap-0.5 rounded-full px-3 text-sm font-bold text-primary-ink hover:bg-primary-soft"
          >
            ぜんぶ見る
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        {rest.length === 0 ? (
          <p className="ui-card p-5 text-sm text-ink-muted">ほかの課題はないよ。</p>
        ) : (
          <ol className="ui-card divide-y divide-line overflow-hidden">
            {rest.map((a, i) => (
              <li key={a.task.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${TRIAGE_STYLE[a.triage].tag}`}
                >
                  {i + 2}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{a.task.title}</span>
                  <span className="text-xs text-ink-muted">
                    {a.label}・{formatRemaining(a.ms)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
