import {
  animate,
  motion,
  useMotionValue,
  type AnimationPlaybackControls,
  type PanInfo,
} from 'framer-motion'
import { ChevronsUpDown, Plus } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { TRIAGE_STYLE } from '../constants'
import { markRun, monthCells, tasksByDay } from '../logic/calendar'
import { addDays, dayKey, keyStart, rangeKeys } from '../logic/schedule'
import { baseTransition } from '../motion'
import type { Analysed, DayKind, Schedule } from '../types'
import { ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'

interface Props {
  schedule: Schedule
  now: number
  /** 未完了の課題（締切の日に出す） */
  analysed: Analysed[]
  onSetDays: (dates: string[], kind: DayKind | null) => void
  /** 課題を追加する（日付から開いたときは、その日を締切の初期値に） */
  onAddTask: (defaultDue?: number) => void
  onEditTask: (id: string) => void
}

const WEEK_HEAD = ['月', '火', '水', '木', '金', '土', '日']
const WEEKDAY_NAME = ['日', '月', '火', '水', '木', '金', '土']

/**
 * マスの塗り（実習は薄い紺、休みは灰色。続く日は塗りがつながって見える）。
 * テストは、タッグの色とまぎれないよう塗らずに点線の枠にする
 */
const KIND_CELL: Record<DayKind, string> = {
  practice: 'bg-primary-soft',
  off: 'bg-line',
  test: 'bg-surface outline-1 -outline-offset-1 outline-ink-muted outline-dashed',
}
const KIND_MARK: Record<DayKind, { char: string; className: string }> = {
  practice: { char: '実', className: 'text-primary-ink' },
  off: { char: '休', className: 'text-ink-muted' },
  test: { char: '試', className: 'text-ink' },
}
const KIND_NAME: Record<DayKind, string> = { practice: '実習', off: '休み', test: 'テスト' }
const KIND_OPTIONS: { value: DayKind; label: string }[] = [
  { value: 'practice', label: '実習' },
  { value: 'off', label: '休み' },
  { value: 'test', label: 'テスト' },
]

/** となりの月の表との間（px） */
const PANEL_GAP = 16
/** 指を離したとき、表の幅のこの割合より動かしていたら月を変える */
const SWIPE_RATIO = 0.2
/** タップで指がずれても、なぞったとみなさない幅（px） */
const TAP_SLOP = 10
/** これより速く払ったら、動かした距離が短くても月を変える（px/秒） */
const SWIPE_VELOCITY = 400

/** 'YYYY-MM' を n か月ずらす */
const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number)
  return dayKey(new Date(y, m - 1 + n, 1).getTime()).slice(0, 7)
}

/** マスの中の大きさ（px）：上下の余白 4+4、日付の行 16、課題1件ごとに 4+16 */
const CELL_PAD = 8
const DATE_ROW = 16
const CHIP_ROW = 20

const shortDate = (key: string) => {
  const d = new Date(keyStart(key))
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_NAME[d.getDay()]})`
}
/** 「11/24」（曜日なし。ボタンの中など狭いところ用） */
const monthDay = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8))}`
const timeOf = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
/** その日の 17:00（日付から課題を追加するときの締切の初期値） */
const fivePm = (key: string) => keyStart(key) + 17 * 60 * 60 * 1000

const softBtn =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary'
const label = 'text-xs font-bold tracking-wide text-ink-muted'

/** 表の高さ。マスに課題を何件まで並べられるかを、月の行の数ごとに計算するのに使う */
function useHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, height] as const
}

/** 行の数が rows の月で、1マスに並べられる課題の数（マスの間は gap-1 = 4px） */
function chipCapacity(height: number, rows: number): number {
  const cell = (height - 4 * (rows - 1)) / rows
  return Math.max(1, Math.floor((cell - CELL_PAD - DATE_ROW) / CHIP_ROW))
}

/** 1か月の表。なぞっている間はとなりの月も並べるので、部品にしておく */
function MonthGrid({
  month,
  schedule,
  byDay,
  today,
  height,
  current,
  onSelect,
}: {
  month: string
  schedule: Schedule
  byDay: Map<string, Analysed[]>
  today: string
  height: number
  /** いま見ている月か。となりの月は読み上げ・フォーカスの対象にしない */
  current: boolean
  onSelect: (key: string) => void
}) {
  const [y, m] = month.split('-').map(Number)
  const cells = useMemo(() => monthCells(month), [month])
  const rows = cells.length / 7
  const capacity = chipCapacity(height, rows)
  return (
    <div
      role="grid"
      aria-label={`${y}年${m}月のカレンダー`}
      aria-hidden={!current || undefined}
      inert={!current}
      className="grid size-full grid-cols-7 gap-1"
      style={{ gridTemplateRows: `repeat(${rows}, minmax(44px, 1fr))` }}
    >
      {cells.map((key, i) => {
        if (key === null) return <span key={`blank-${i}`} aria-hidden />
        const kind = schedule[key]
        const tasks = byDay.get(key) ?? []
        const shown = tasks.length > capacity ? tasks.slice(0, capacity - 1) : tasks
        const more = tasks.length - shown.length
        const isToday = key === today
        const past = key < today
        return (
          <button
            key={key}
            type="button"
            data-cell
            onClick={() => onSelect(key)}
            aria-label={`${shortDate(key)}${kind ? ` ${KIND_NAME[kind]}` : ''}${tasks.length ? ` 締切${tasks.length}件` : ''}${isToday ? '（今日）' : ''}`}
            className={`flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden rounded-xl p-1 text-left focus-visible:outline-2 focus-visible:outline-primary-ink ${
              kind ? KIND_CELL[kind] : 'bg-surface'
            } ${isToday ? 'ring-2 ring-ink ring-inset' : ''}`}
          >
            <span className="flex h-4 shrink-0 items-center justify-between gap-1 px-1 text-xs leading-4">
              <span
                className={`tabular-nums ${isToday ? 'font-bold text-ink' : past ? 'text-ink-muted' : 'text-ink'}`}
              >
                {Number(key.slice(8))}
              </span>
              {kind && (
                <span aria-hidden className={`font-bold ${KIND_MARK[kind].className}`}>
                  {KIND_MARK[kind].char}
                </span>
              )}
            </span>
            {shown.map((a) => (
              <span
                key={a.task.id}
                className="flex h-4 min-w-0 shrink-0 items-center gap-1 text-xs leading-4"
              >
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${TRIAGE_STYLE[a.triage].dot}`}
                />
                <span className="truncate text-ink">{a.task.title}</span>
              </span>
            ))}
            {more > 0 && (
              <span className="h-4 shrink-0 px-1 text-xs leading-4 text-ink-muted">+{more}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

type AddKind = DayKind | 'task'

/**
 * カレンダー。TimeTree のように、実習・休み・テストの予定と課題の締切を1つの月の表に出す。
 * 日付をタップするとその日のシート、右下の＋で予定（実習・休み・テスト・課題）を追加する。
 * 表を左右になぞると前後の月に移る。
 */
export function ScheduleScreen({
  schedule,
  now,
  analysed,
  onSetDays,
  onAddTask,
  onEditTask,
}: Props) {
  const today = dayKey(now)
  const [month, setMonth] = useState(() => today.slice(0, 7)) // YYYY-MM
  const [selected, setSelected] = useState<string | null>(null) // 開いている日のシート
  const [trackRef, height] = useHeight()
  /** 表の横の位置。指に合わせて動かし、離したら月の幅ぶん送るか、元に戻す */
  const x = useMotionValue(0)
  /** 月を送るときにずらした月の数（表の位置の付け替えに使う） */
  const shifted = useRef(0)
  /** 表を動かしているアニメーション。なぞり始めたら止め、指の動きを優先する */
  const slide = useRef<AnimationPlaybackControls | null>(null)
  /** いまの指の動きが、はっきり横になぞったものか（なぞったあとのタップで日のシートを開かないため） */
  const dragged = useRef(false)

  // 予定を追加するシート
  const [addOpen, setAddOpen] = useState(false)
  const [addKind, setAddKind] = useState<AddKind>('practice')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(() => addDays(today, 13))
  const [skipWeekends, setSkipWeekends] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)

  const [y, m] = month.split('-').map(Number)
  const cells = useMemo(() => monthCells(month), [month])
  const monthKeys = cells.filter((c): c is string => c !== null)
  const count = (k: DayKind) => monthKeys.filter((c) => schedule[c] === k).length
  const byDay = useMemo(() => tasksByDay(analysed), [analysed])
  const rank = useMemo(() => new Map(analysed.map((a, i) => [a.task.id, i + 1])), [analysed])

  /** となりの月までの距離（表の幅＋間） */
  const pageWidth = () => (trackRef.current?.clientWidth ?? 0) + PANEL_GAP

  const slideTo = (to: number) => {
    slide.current?.stop()
    slide.current = animate(x, to, baseTransition)
  }

  /**
   * n = 1 で次の月、-1 で前の月へ。先に月を切り替え、見た目が動かないよう表の位置を付け替えてから、
   * 真ん中へ動かす。途中でまたなぞったり押したりしても、月と表の位置がずれない
   */
  const moveMonth = (n: 1 | -1) => {
    shifted.current += n
    setMonth((mo) => shiftMonth(mo, n))
  }

  // 月が変わったら、表の位置を付け替える（描く前に付け替えるので、ちらつかない）。
  // 矢印・なぞりで送ったときは真ん中へ動かし、予定の追加などで月が飛んだときはそのまま真ん中に置く
  useLayoutEffect(() => {
    const n = shifted.current
    shifted.current = 0
    if (n === 0) {
      slide.current?.stop()
      x.set(0)
      return
    }
    x.set(x.get() + n * pageWidth())
    slideTo(0)
    // pageWidth・slideTo は毎回作り直すが、中で使う ref・x は変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, x])

  // 表を左右になぞると、指に合わせて動き、となりの月がのぞく。離したら月を変えるか元に戻す
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const limit = (trackRef.current?.clientWidth ?? 0) * SWIPE_RATIO
    if (info.offset.x < -limit || info.velocity.x < -SWIPE_VELOCITY) moveMonth(1)
    else if (info.offset.x > limit || info.velocity.x > SWIPE_VELOCITY) moveMonth(-1)
    else slideTo(0)
  }
  const onClickCapture = (e: MouseEvent) => {
    if (!dragged.current) return
    e.stopPropagation()
    e.preventDefault()
  }

  const openAdd = () => {
    setAddError(null)
    setAddOpen(true)
  }

  const chooseAddKind = (k: AddKind) => {
    if (k === 'task') {
      // 課題はいつものフォームで追加する
      setAddOpen(false)
      onAddTask()
      return
    }
    // テストは1日だけのことが多いので、終わりの日を始まりの日にそろえる
    if (k === 'test') setEnd(start)
    setAddKind(k)
  }

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    if (addKind === 'task') return
    if (!start || !end) return setAddError('開始日と終了日を入れてね。')
    if (end < start) return setAddError('終了日は、開始日と同じかそれよりあとにしてね。')
    const keys = rangeKeys(start, end, skipWeekends)
    if (keys.length === 0) return setAddError('土日だけの期間なので、入れる日がないよ。')
    onSetDays(keys, addKind)
    setMonth(start.slice(0, 7))
    setAddOpen(false)
  }

  // 日のシート
  const dayKind = selected ? schedule[selected] : undefined
  const run = selected ? markRun(schedule, selected) : []
  const dayTasks = selected ? (byDay.get(selected) ?? []) : []

  return (
    <ScreenLayout
      title="カレンダー"
      sub={
        <div className="flex items-center gap-2">
          {/* 押すと年と月を回して選べる（端末の月の選び方を、見えない input で重ねる） */}
          <div className="relative flex min-h-11 items-center gap-1 rounded-2xl has-focus-visible:ring-2 has-focus-visible:ring-primary/25">
            <h2 className="text-base font-bold whitespace-nowrap tabular-nums" aria-live="polite">
              {y}年{m}月
            </h2>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-ink-muted" />
            <input
              type="month"
              aria-label="年と月を選ぶ"
              className="ui-picker"
              value={month}
              onChange={(e) => {
                // 空にされたとき（iPhone の「消去」）は何もしない
                if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value)
              }}
              onClick={(e) => e.currentTarget.showPicker?.()}
            />
          </div>
          {/* この月の日数。マスの印と同じ1文字で、狭い画面でも1行に収める */}
          <p className="ml-auto flex gap-2 text-sm whitespace-nowrap text-ink-muted">
            {KIND_OPTIONS.map((o) => (
              <span key={o.value} aria-label={`${o.label} ${count(o.value)}日`}>
                <span aria-hidden className={`font-bold ${KIND_MARK[o.value].className}`}>
                  {KIND_MARK[o.value].char}
                </span>{' '}
                <b aria-hidden className="text-ink tabular-nums">
                  {count(o.value)}
                </b>
              </span>
            ))}
          </p>
        </div>
      }
      onAdd={openAdd}
      addLabel="予定を追加する"
      fill
    >
      <div aria-hidden className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-ink-muted">
        {WEEK_HEAD.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* 前・今・次の月を横に並べ、x で動かす。見えるのは真ん中の月だけ */}
      <div ref={trackRef} className="relative min-h-0 flex-1 overflow-hidden">
        <motion.div
          drag="x"
          dragDirectionLock
          dragMomentum={false}
          onPointerDownCapture={() => (dragged.current = false)}
          onDragStart={() => slide.current?.stop()}
          onDrag={(_, info) => {
            // タップで指が少しずれただけなら、なぞったことにしない
            if (Math.abs(info.offset.x) > TAP_SLOP) dragged.current = true
          }}
          onDragEnd={onDragEnd}
          onClickCapture={onClickCapture}
          style={{ x }}
          className="absolute inset-0"
        >
          {([-1, 0, 1] as const).map((n) => {
            const mo = shiftMonth(month, n)
            return (
              <div
                key={mo}
                className="absolute inset-y-0 w-full"
                style={{ left: `calc(${n * 100}% + ${n * PANEL_GAP}px)` }}
              >
                <MonthGrid
                  month={mo}
                  schedule={schedule}
                  byDay={byDay}
                  today={today}
                  height={height}
                  current={n === 0}
                  onSelect={setSelected}
                />
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* 日のシート：その日の予定と、締切の課題 */}
      <Sheet
        open={selected !== null}
        title={selected ? shortDate(selected) : ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h3 className={label}>予定</h3>
              <Segmented
                label="この日の予定"
                value={dayKind ?? 'none'}
                onChange={(v) => onSetDays([selected], v === 'none' ? null : v)}
                options={[...KIND_OPTIONS, { value: 'none' as const, label: 'なし' }]}
              />
              {dayKind && run.length > 1 && (
                <button
                  type="button"
                  onClick={() => onSetDays(run, null)}
                  className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper"
                >
                  {monthDay(run[0])}〜{monthDay(run[run.length - 1])} の{KIND_NAME[dayKind]}
                  をまとめて外す
                </button>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className={label}>この日が締切の課題</h3>
              {dayTasks.length === 0 ? (
                <p className="text-sm leading-6 text-ink">この日が締切の課題はないよ。</p>
              ) : (
                <ul className="ui-card divide-y divide-line overflow-hidden rounded-2xl">
                  {dayTasks.map((a) => (
                    <li key={a.task.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(null)
                          onEditTask(a.task.id)
                        }}
                        className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left transition hover:bg-paper"
                        aria-label={`${rank.get(a.task.id)}番目・${TRIAGE_STYLE[a.triage].name}「${a.label}」 ${a.task.title}を編集`}
                      >
                        <span
                          aria-hidden
                          className={`w-10 shrink-0 rounded-full text-center text-xs leading-6 font-bold ${TRIAGE_STYLE[a.triage].tag}`}
                        >
                          {TRIAGE_STYLE[a.triage].name}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {a.task.title}
                        </span>
                        <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                          {timeOf(a.task.due)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className={softBtn}
                onClick={() => {
                  const due = fivePm(selected)
                  setSelected(null)
                  onAddTask(due)
                }}
              >
                <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                この日が締切の課題を追加
              </button>
            </section>
          </div>
        )}
      </Sheet>

      {/* ＋：予定を追加（実習・休み・テストは期間で、課題はいつものフォームで） */}
      <Sheet open={addOpen} title="予定を追加" onClose={() => setAddOpen(false)}>
        <form onSubmit={submitAdd} noValidate className="flex flex-col gap-4">
          <Segmented
            label="追加するもの"
            value={addKind}
            onChange={chooseAddKind}
            options={[...KIND_OPTIONS, { value: 'task' as const, label: '課題' }]}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="ui-label min-w-0">
              開始日
              <input
                type="date"
                className="ui-input px-2"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value)
                  // テストは1日だけのことが多いので、終わりの日も一緒に動かす
                  if (addKind === 'test') setEnd(e.target.value)
                }}
              />
            </label>
            <label className="ui-label min-w-0">
              終了日
              <input
                type="date"
                className="ui-input px-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="size-5 accent-primary"
            />
            土日を除く
          </label>
          {addError && (
            <p role="alert" className="text-sm font-bold text-danger">
              {addError}
            </p>
          )}
          <button
            type="submit"
            className="min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong"
          >
            {KIND_NAME[addKind as DayKind]}を追加する
          </button>
        </form>
      </Sheet>
    </ScreenLayout>
  )
}
