import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { TRIAGE_STYLE } from '../constants'
import { markRun, monthCells, tasksByDay } from '../logic/calendar'
import { addDays, dayKey, keyStart, rangeKeys } from '../logic/schedule'
import { ENTER_DISTANCE, baseTransition } from '../motion'
import type { Analysed, DayKind, Schedule, Settings } from '../types'
import { CalendarHelp } from './Help'
import { HelpButton, ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'

interface Props {
  schedule: Schedule
  settings: Settings
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

/** 横にこれだけ動かしたら、月を変えるスワイプとみなす（px） */
const SWIPE_MIN = 48

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

const navBtn =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface hover:text-ink'
const softBtn =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary'
const label = 'text-xs font-bold tracking-wide text-ink-muted'

/** マスの高さから、課題を何件まで並べられるか。月で行の数が変わるので、月が変わったら測り直す */
function useChipCapacity(month: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [cap, setCap] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const cell = el.querySelector<HTMLElement>('[data-cell]')
      if (!cell) return
      const h = cell.getBoundingClientRect().height
      setCap(Math.max(1, Math.floor((h - CELL_PAD - DATE_ROW) / CHIP_ROW)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [month])
  return [ref, cap] as const
}

type AddKind = DayKind | 'task'

/**
 * カレンダー。TimeTree のように、実習・休み・テストの予定と課題の締切を1つの月の表に出す。
 * 日付をタップするとその日のシート、右下の＋で予定（実習・休み・テスト・課題）を追加する。
 * 表を左右になぞると前後の月に移る。
 */
export function ScheduleScreen({
  schedule,
  settings,
  now,
  analysed,
  onSetDays,
  onAddTask,
  onEditTask,
}: Props) {
  const today = dayKey(now)
  const [month, setMonth] = useState(() => today.slice(0, 7)) // YYYY-MM
  const [selected, setSelected] = useState<string | null>(null) // 開いている日のシート
  const [help, setHelp] = useState(false)
  const [gridRef, capacity] = useChipCapacity(month)
  /** 月を動かした向き（1：次の月、-1：前の月）。表が入ってくる向きに使う */
  const [dir, setDir] = useState(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  /** 最後に月を変えるスワイプをした時刻（直後のタップを無視するため） */
  const swipedAt = useRef(-Infinity)

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

  const moveMonth = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setDir(Math.sign(n))
    setMonth(dayKey(d.getTime()).slice(0, 7))
  }

  // 表を左右になぞると月を変える（左へなぞると次の月）。縦の動きが大きいときは何もしない
  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const from = swipe.current
    swipe.current = null
    if (!from) return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return
    // なぞったあとに来るタップで、日のシートが開かないようにする
    swipedAt.current = e.timeStamp
    moveMonth(dx < 0 ? 1 : -1)
  }
  const onClickCapture = (e: MouseEvent) => {
    if (e.timeStamp - swipedAt.current > 500) return
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
      aside={<HelpButton label="カレンダーの使い方" onClick={() => setHelp(true)} />}
      sub={
        <div className="-ml-2 flex items-center gap-1">
          <button
            type="button"
            className={navBtn}
            onClick={() => moveMonth(-1)}
            aria-label="前の月"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <h2
            className="w-28 text-center text-base font-bold whitespace-nowrap tabular-nums"
            aria-live="polite"
          >
            {y}年{m}月
          </h2>
          <button type="button" className={navBtn} onClick={() => moveMonth(1)} aria-label="次の月">
            <ChevronRight aria-hidden className="size-5" />
          </button>
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
      <motion.div
        key={month}
        initial={dir === 0 ? false : { opacity: 0, x: dir * ENTER_DISTANCE }}
        animate={{ opacity: 1, x: 0 }}
        transition={baseTransition}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        onClickCapture={onClickCapture}
        className="flex min-h-0 flex-1 touch-pan-y flex-col"
      >
        <div aria-hidden className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-ink-muted">
          {WEEK_HEAD.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div
          ref={gridRef}
          role="grid"
          aria-label={`${y}年${m}月のカレンダー`}
          className="grid min-h-0 flex-1 grid-cols-7 gap-1"
          style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(44px, 1fr))` }}
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
                onClick={() => setSelected(key)}
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
                  <span className="h-4 shrink-0 px-1 text-xs leading-4 text-ink-muted">
                    +{more}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

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

      <Sheet open={help} title="カレンダーの使い方" onClose={() => setHelp(false)}>
        <CalendarHelp hoursPractice={settings.hoursPractice} hoursNormal={settings.hoursNormal} />
      </Sheet>
    </ScreenLayout>
  )
}
