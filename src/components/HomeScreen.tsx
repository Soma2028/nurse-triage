import { motion } from 'framer-motion'
import type { HomeView } from '../logic/home'
import { enter } from '../motion'
import type { Analysed, Plan } from '../types'
import { formatHours } from '../utils/format'
import { Chara, type Mood } from './Chara'
import { OverloadWarning } from './OverloadWarning'
import { ScreenLayout } from './ScreenLayout'
import { Check } from 'lucide-react'
import { Group } from './Group'
import { PageStack } from './PageStack'
import { TaskDetailPage } from './TaskDetailPage'
import { usePageNav } from './pageNav'
import { ProgressSlider, Reason, TagChip, TaskMeta, TaskRow } from './TaskRow'
import { todayProgress, type TodayProgress } from '../logic/today'
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
  /** 今日進めた時間 */
  worked: number
  /** つぎにやるのスライダーで進捗を変えたとき */
  onSetProgress: (id: string, progress: number) => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

/**
 * 「つぎにやる」の1件。上を押すとくわしいページ。進み具合はスライダーで、その場で動かせる。
 * 主役は課題名と進み具合（タッグは課題名の上の小さな札）
 */
function NextCard({
  a,
  rank,
  onOpen,
  onComplete,
  onSetProgress,
}: {
  a: Analysed
  rank: number
  onOpen: () => void
  onComplete: () => void
  onSetProgress: (progress: number) => void
}) {
  return (
    <div className="ui-card flex flex-col gap-2 p-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col gap-2 text-left"
        aria-label={`${rank}番目「${a.label}」 ${a.task.title}のくわしいこと`}
      >
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
          <TagChip a={a} rank={rank} size="sm" />
          <span className="truncate">
            <TaskMeta a={a} />
          </span>
        </span>
        <span className="text-title font-bold break-words text-ink">{a.task.title}</span>
        <span className="text-sm leading-6 text-ink-muted">
          <Reason a={a} />
        </span>
      </button>
      <ProgressSlider key={a.task.id} a={a} onCommit={onSetProgress} />
      <button
        type="button"
        onClick={onComplete}
        className="mt-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-primary text-sm font-bold text-on-primary transition hover:bg-primary-strong"
      >
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
        完了
      </button>
    </div>
  )
}

/**
 * いちばん上：キャラクターと「今日のぶん」。カードにせず、背景の上にそのまま置く。
 * キャラクターの顔は、今日のぶんが終わったら笑顔、急ぎ（黒・赤）があれば心配顔
 */
function TodayHeader({
  progress,
  hours,
  urgent,
}: {
  progress: TodayProgress
  hours: number
  urgent: boolean
}) {
  const { worked, target, ratio } = progress
  const finished = target > 0 && ratio >= 1
  const mood: Mood = finished ? 'happy' : urgent ? 'worry' : 'normal'
  const showBar = hours > 0 && target > 0
  let line: string
  if (hours === 0) line = worked > 0 ? '休みの日なのに、えらいね。' : '今日は休みの日だよ。'
  else if (finished) line = '今日のぶんは終わったよ。おつかれさま。'
  else if (worked === 0) line = '「つぎにやる」から始めよう。'
  else line = `あと${formatHours(target - worked)}だよ。`

  return (
    <section aria-label="今日のぶん" className="flex items-center gap-4 px-2">
      <Chara mood={mood} size={64} />
      <div className="min-w-0 flex-1">
        {showBar && (
          <>
            <p className="flex items-baseline justify-between gap-2 text-sm text-ink-muted">
              <span className="font-bold text-ink">今日のぶん</span>
              <span className="tabular-nums">
                <b className="text-base text-ink">{formatHours(worked)}</b> / {formatHours(target)}
              </span>
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="今日のぶんの進み具合"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratio * 100)}
            >
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </>
        )}
        <p className={`text-sm text-ink ${showBar ? 'mt-2' : ''}`}>{line}</p>
      </div>
    </section>
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

const label = 'px-4 text-xs font-bold tracking-wide text-ink-muted'

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
  worked,
  onSetProgress,
  onComplete,
  onEdit,
  onRemove,
  onAdd,
}: Props) {
  // くわしいページを開いている課題（null なら一覧）
  const { page: openId, dir, go: setOpenId, back, isTop } = usePageNav<string | null>(null)
  const { next, urgent } = view

  return (
    <PageStack pageKey={openId ?? 'list'} dir={dir} isTop={isTop} onBack={back}>
      {openId ? (
        <TaskDetailPage
          analysed={analysed}
          id={openId}
          backLabel="ホームにもどる"
          onBack={back}
          onSetProgress={onSetProgress}
          onComplete={onComplete}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ) : (
        <ScreenLayout title={date} note={dayNote} onAdd={onAdd}>
          <div className="flex flex-col gap-6">
            {analysed.length > 0 && (
              <TodayHeader
                progress={todayProgress(worked, plan)}
                hours={plan.hours}
                urgent={redCount + blackCount > 0}
              />
            )}

            <OverloadWarning a={shortage} onOpen={setOpenId} />

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
                  onSetProgress={(v) => onSetProgress(next.task.id, v)}
                  onComplete={() => onComplete(next.task.id)}
                />
              </motion.section>
            ) : null}

            {analysed.length > 0 && (
              <motion.div {...enter(0.08)}>
                <TodayPlan plan={plan} onOpen={setOpenId} />
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
        </ScreenLayout>
      )}
    </PageStack>
  )
}
