import { useId, useState, type FormEvent } from 'react'
import { addDays, dayKey, keyStart, rangeKeys, weekday } from '../logic/schedule'
import type { DayKind, Schedule, Settings } from '../types'
import { formatHours } from '../utils/format'
import { Button } from './Button'
import { Chevron } from './Chevron'

interface Props {
  schedule: Schedule
  settings: Settings
  now: number
  onSetDays: (dates: string[], kind: DayKind | null) => void
}

/** 塗る種類。null は「消す」 */
type Paint = DayKind | null

const PAINTS: { value: Paint; label: string }[] = [
  { value: 'practice', label: '実習' },
  { value: 'off', label: '休み' },
  { value: null, label: '消す' },
]
const WEEK_HEAD = ['月', '火', '水', '木', '金', '土', '日']
const WEEKDAY_NAME = ['日', '月', '火', '水', '木', '金', '土']

const KIND_CELL: Record<DayKind, string> = {
  practice: 'bg-navy text-white dark:bg-sky-700',
  off: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
}
const KIND_MARK: Record<DayKind, string> = { practice: '実', off: '休' }
const KIND_NAME: Record<DayKind, string> = { practice: '実習日', off: '休み' }

const inputClass =
  'mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]'

function Segment({
  value,
  onChange,
  label,
}: {
  value: Paint
  onChange: (p: Paint) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
    >
      {PAINTS.map((p) => (
        <button
          key={p.label}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          onClick={() => onChange(p.value)}
          className={`min-h-11 border-slate-300 text-sm font-medium not-first:border-l dark:border-slate-600 ${
            value === p.value
              ? 'bg-navy text-white dark:bg-sky-600'
              : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

const shortDate = (key: string) => {
  const d = new Date(keyStart(key))
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_NAME[d.getDay()]})`
}

export function ScheduleCalendar({ schedule, settings, now, onSetDays }: Props) {
  const id = useId()
  const today = dayKey(now)
  const [month, setMonth] = useState(() => today.slice(0, 7)) // YYYY-MM
  const [paint, setPaint] = useState<Paint>('practice')

  // 期間で塗る
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(() => addDays(today, 13))
  const [rangePaint, setRangePaint] = useState<Paint>('practice')
  const [skipWeekends, setSkipWeekends] = useState(true)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeDone, setRangeDone] = useState<string | null>(null)

  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const daysInMonth = new Date(y, m, 0).getDate()
  const offset = (weekday(first) + 6) % 7 // 月曜始まり
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ]
  const monthKeys = cells.filter((c): c is string => c !== null)
  const count = (k: DayKind) => monthKeys.filter((c) => schedule[c] === k).length

  const moveMonth = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setMonth(dayKey(d.getTime()).slice(0, 7))
  }

  const tap = (key: string) => {
    // 同じ種類が付いている日をもう一度タップしたら外す
    const next = schedule[key] === paint ? null : paint
    onSetDays([key], next)
  }

  const applyRange = (e: FormEvent) => {
    e.preventDefault()
    setRangeDone(null)
    if (!start || !end) return setRangeError('開始日と終了日を入力してください')
    if (end < start) return setRangeError('終了日は開始日より後にしてください')
    const keys = rangeKeys(start, end, skipWeekends)
    if (keys.length === 0) return setRangeError('対象の日がありません（土日だけの期間です）')
    setRangeError(null)
    onSetDays(keys, rangePaint)
    const what = rangePaint ? `${KIND_NAME[rangePaint]}に` : 'の印を消'
    setRangeDone(
      `${shortDate(start)}〜${shortDate(end)}${skipWeekends ? 'の平日' : ''} ${keys.length}日を${what}しました`,
    )
    setMonth(start.slice(0, 7))
  }

  return (
    <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-heading text-lg font-bold select-none [&::-webkit-details-marker]:hidden">
        <Chevron />
        実習スケジュール
      </summary>

      <div className="px-2 pb-4 sm:px-4">
        <p className="px-2 text-sm leading-relaxed text-slate-600 sm:px-0 dark:text-slate-300">
          日ごとに印を付けると、締切までに使える時間をその日の予定で計算します。 実習日{' '}
          {formatHours(settings.hoursPractice)}・印なし（通常日）
          {formatHours(settings.hoursNormal)}・休み 0h。今日が実習日なら「実習期間中」が自動で ON
          になります。
        </p>

        {/* 塗る種類 */}
        <div className="mt-3 px-2 sm:px-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">タップで付ける印</p>
          <div className="mt-1">
            <Segment value={paint} onChange={setPaint} label="タップで付ける印" />
          </div>
        </div>

        {/* 月の切り替え */}
        <div className="mt-3 flex items-center justify-between px-1 sm:px-0">
          <Button variant="ghost" onClick={() => moveMonth(-1)} aria-label="前の月">
            <Chevron direction="left" />
          </Button>
          <h3 className="font-heading text-base font-bold" aria-live="polite">
            {y}年{m}月
          </h3>
          <Button variant="ghost" onClick={() => moveMonth(1)} aria-label="次の月">
            <Chevron direction="right" />
          </Button>
        </div>

        {/* カレンダー（360px 幅でも1マス44px以上になるよう、ここだけ左右の余白を詰める） */}
        <div className="-mx-1 mt-1">
          <div
            aria-hidden
            className="grid grid-cols-7 text-center text-xs text-slate-500 dark:text-slate-400"
          >
            {WEEK_HEAD.map((w, i) => (
              <span
                key={w}
                className={`py-1 ${i === 5 ? 'text-sky-700 dark:text-sky-400' : ''} ${i === 6 ? 'text-tag-red dark:text-red-400' : ''}`}
              >
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {cells.map((key, i) =>
              key === null ? (
                <span key={`blank-${i}`} aria-hidden />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => tap(key)}
                  aria-label={`${shortDate(key)} ${schedule[key] ? KIND_NAME[schedule[key]] : '通常日'}${key === today ? '（今日）' : ''}`}
                  className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md text-sm leading-none tabular-nums focus-visible:outline-2 focus-visible:outline-sky-500 ${
                    schedule[key]
                      ? KIND_CELL[schedule[key]]
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  } ${key === today ? 'ring-2 ring-tag-yellow ring-inset' : ''} ${key < today ? 'opacity-50' : ''}`}
                >
                  <span className={key === today ? 'font-bold' : ''}>{Number(key.slice(8))}</span>
                  <span aria-hidden className="mt-0.5 h-3 text-[10px] font-bold">
                    {schedule[key] ? KIND_MARK[schedule[key]] : ''}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-slate-600 sm:px-0 dark:text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className={`inline-block size-3 rounded-sm ${KIND_CELL.practice}`} />
            実習 {count('practice')}日
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className={`inline-block size-3 rounded-sm ${KIND_CELL.off}`} />
            休み {count('off')}日
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm ring-2 ring-tag-yellow ring-inset"
            />
            今日
          </span>
        </p>

        {/* 期間で塗る */}
        <form
          onSubmit={applyRange}
          noValidate
          className="mx-2 mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:mx-0 dark:border-slate-700"
          aria-labelledby={`${id}-range`}
        >
          <h3 id={`${id}-range`} className="text-base font-bold">
            期間で塗る
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">
              開始日
              <input
                type="date"
                className={inputClass}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">
              終了日
              <input
                type="date"
                className={inputClass}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <Segment value={rangePaint} onChange={setRangePaint} label="期間に付ける印" />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="size-5 accent-navy dark:accent-sky-500"
            />
            土日を除く
          </label>
          {rangeError && (
            <p role="alert" className="text-sm font-medium text-tag-red dark:text-red-400">
              {rangeError}
            </p>
          )}
          {rangeDone && (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
              {rangeDone}
            </p>
          )}
          <Button type="submit" variant="primary">
            まとめて塗る
          </Button>
        </form>
      </div>
    </details>
  )
}
