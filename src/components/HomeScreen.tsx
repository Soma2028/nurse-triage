import { motion } from 'framer-motion'
import { useState } from 'react'
import { TRIAGE_STYLE } from '../constants'
import type { HomeView } from '../logic/home'
import { enter } from '../motion'
import type { Analysed, Plan } from '../types'
import { formatHours } from '../utils/format'
import { Chara } from './Chara'
import { OverloadWarning } from './OverloadWarning'
import { ScreenLayout } from './ScreenLayout'
import { Check } from 'lucide-react'
import { PROGRESS_STEP } from '../store/reducer'
import { Group } from './Group'
import { TaskDetailSheet } from './TaskDetailSheet'
import { Reason, TagChip, TaskMeta, TaskRow } from './TaskRow'
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
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

/**
 * 「つぎにやる」の1件。上を押すとくわしいシート、下の2つのボタンでその場で進められる
 */
function NextCard({
  a,
  rank,
  onOpen,
  onComplete,
  onAdvance,
}: {
  a: Analysed
  rank: number
  onOpen: () => void
  onComplete: () => void
  onAdvance: () => void
}) {
  return (
    <div className="ui-card flex flex-col gap-3 p-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-start gap-3 text-left"
        aria-label={`${rank}番目「${a.label}」 ${a.task.title}のくわしいこと`}
      >
        <TagChip a={a} rank={rank} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold break-words text-ink">{a.task.title}</span>
          <span className="block text-xs text-ink-muted">
            <TaskMeta a={a} />
          </span>
        </span>
      </button>
      <p className="text-sm leading-6 text-ink-muted">
        <Reason a={a} />
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-primary text-sm font-bold text-on-primary transition hover:bg-primary-strong"
        >
          <Check aria-hidden className="size-4" strokeWidth={2.5} />
          完了
        </button>
        <button
          type="button"
          onClick={onAdvance}
          aria-label={`進捗を${PROGRESS_STEP}%進める`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line bg-surface text-sm font-bold text-ink transition hover:bg-paper"
        >
          +{PROGRESS_STEP}%
        </button>
      </div>
    </div>
  )
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
  onEdit,
  onRemove,
  onAdd,
}: Props) {
  // くわしいシートを開いている課題
  const [openId, setOpenId] = useState<string | null>(null)
  const { next, urgent } = view

  return (
    <ScreenLayout
      title={date}
      note={dayNote}
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
            <NextCard
              a={next}
              rank={analysed.indexOf(next) + 1}
              onOpen={() => setOpenId(next.task.id)}
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
          <Group label="ほかの急ぎ">
            {urgent.map((a) => (
              <TaskRow
                key={a.task.id}
                a={a}
                rank={analysed.indexOf(a) + 1}
                onOpen={() => setOpenId(a.task.id)}
              />
            ))}
          </Group>
        )}
      </div>
      <TaskDetailSheet
        analysed={analysed}
        openId={openId}
        onClose={() => setOpenId(null)}
        onAdvance={onAdvance}
        onComplete={onComplete}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </ScreenLayout>
  )
}
