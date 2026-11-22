import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addDays, dayKey, keyStart, rangeKeys, weekday } from '../logic/schedule'
import type { DayKind, Schedule, Settings } from '../types'
import { formatHours } from '../utils/format'
import { PageTitle } from './PageTitle'
import { Segmented } from './Segmented'

interface Props {
  schedule: Schedule
  settings: Settings
  now: number
  onSetDays: (dates: string[], kind: DayKind | null) => void
}

/** 塗る種類。null は「消す」 */
type Paint = DayKind | null

const PAINT_OPTIONS: { value: Paint; label: string }[] = [
  { value: 'practice', label: '実習' },
  { value: 'off', label: '休み' },
  { value: null, label: '消す' },
]
const WEEK_HEAD = ['月', '火', '水', '木', '金', '土', '日']
const WEEKDAY_NAME = ['日', '月', '火', '水', '木', '金', '土']

const KIND_CELL: Record<DayKind, string> = {
  practice: 'bg-primary text-on-primary',
  off: 'bg-line text-ink-muted',
}
const KIND_MARK: Record<DayKind, string> = { practice: '実', off: '休' }
const KIND_NAME: Record<DayKind, string> = { practice: '実習日', off: '休み' }

const shortDate = (key: string) => {
  const d = new Date(keyStart(key))
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_NAME[d.getDay()]})`
}

const navBtn =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-paper hover:text-ink'

/** 実習スケジュール。日ごとに「実習」「休み」の印を付ける */
export function ScheduleScreen({ schedule, settings, now, onSetDays }: Props) {
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
    if (!start || !end) return setRangeError('開始日と終了日を入れてね')
    if (end < start) return setRangeError('終了日は開始日よりあとにしてね')
    const keys = rangeKeys(start, end, skipWeekends)
    if (keys.length === 0) return setRangeError('土日だけの期間なので、塗る日がないよ')
    setRangeError(null)
    onSetDays(keys, rangePaint)
    const what = rangePaint ? `${KIND_NAME[rangePaint]}にしたよ` : 'の印を消したよ'
    setRangeDone(
      `${shortDate(start)}〜${shortDate(end)}${skipWeekends ? 'の平日' : ''} ${keys.length}日を${what}`,
    )
    setMonth(start.slice(0, 7))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>スケジュール</PageTitle>
      <p className="text-sm leading-relaxed text-ink-muted">
        実習の日と休みの日に印を付けておくと、締切までに使える時間をその日の予定で計算するよ。
        実習の日は{formatHours(settings.hoursPractice)}、印のない日は
        {formatHours(settings.hoursNormal)}、休みは0hで数えるね。
      </p>

      <div className="grid grid-cols-1 items-start gap-4 two:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* カレンダー（360px 幅でも1マス44px以上になるよう、左右の余白を詰める） */}
        <section aria-label="カレンダー" className="ui-card px-2 py-4 sm:px-4">
          <div className="px-2 sm:px-0">
            <p className="ui-section-label">タップで付ける印</p>
            <Segmented
              className="mt-1.5"
              label="タップで付ける印"
              value={paint}
              onChange={setPaint}
              options={PAINT_OPTIONS}
            />
          </div>

          <div className="mt-3 flex items-center justify-between px-1 sm:px-0">
            <button
              type="button"
              className={navBtn}
              onClick={() => moveMonth(-1)}
              aria-label="前の月"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <h2 className="font-bold" aria-live="polite">
              {y}年{m}月
            </h2>
            <button
              type="button"
              className={navBtn}
              onClick={() => moveMonth(1)}
              aria-label="次の月"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          <div className="-mx-1 mt-1">
            <div aria-hidden className="grid grid-cols-7 text-center text-xs text-ink-muted">
              {WEEK_HEAD.map((w, i) => (
                <span
                  key={w}
                  className={`py-1 ${i === 5 ? 'text-primary-ink' : ''} ${i === 6 ? 'text-danger' : ''}`}
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
                    className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl text-sm leading-none tabular-nums focus-visible:outline-2 focus-visible:outline-primary-ink ${
                      schedule[key] ? KIND_CELL[schedule[key]] : 'text-ink hover:bg-paper'
                    } ${key === today ? 'ring-2 ring-tag-yellow ring-inset' : ''} ${key < today ? 'opacity-45' : ''}`}
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

          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-ink-muted sm:px-0">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className={`inline-block size-3 rounded ${KIND_CELL.practice}`} />
              実習 {count('practice')}日
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className={`inline-block size-3 rounded ${KIND_CELL.off}`} />
              休み {count('off')}日
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block size-3 rounded ring-2 ring-tag-yellow ring-inset"
              />
              今日
            </span>
          </p>
        </section>

        {/* 期間で塗る */}
        <form
          onSubmit={applyRange}
          noValidate
          className="ui-card flex flex-col gap-3 p-4"
          aria-labelledby="range-heading"
        >
          <h2 id="range-heading" className="ui-card-title">
            期間でまとめて塗る
          </h2>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <label className="ui-label min-w-0">
              開始日
              <input
                type="date"
                className="ui-input px-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
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
          <Segmented
            label="期間に付ける印"
            value={rangePaint}
            onChange={setRangePaint}
            options={PAINT_OPTIONS}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="size-5 accent-primary"
            />
            土日を除く
          </label>
          {rangeError && (
            <p role="alert" className="text-sm font-bold text-danger">
              {rangeError}
            </p>
          )}
          {rangeDone && (
            <p role="status" className="text-sm text-ink-muted">
              {rangeDone}
            </p>
          )}
          <button
            type="submit"
            className="min-h-12 rounded-full bg-primary font-bold text-on-primary transition hover:bg-primary-strong"
          >
            まとめて塗る
          </button>
        </form>
      </div>
    </div>
  )
}
