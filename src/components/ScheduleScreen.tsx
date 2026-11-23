import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addDays, dayKey, keyStart, rangeKeys, weekday } from '../logic/schedule'
import type { DayKind, Schedule, Settings } from '../types'
import { formatHours } from '../utils/format'
import { HelpButton, ScreenLayout } from './ScreenLayout'
import { Sheet } from './Sheet'
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
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface hover:text-ink'

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
  const [rangeOpen, setRangeOpen] = useState(false)
  const [help, setHelp] = useState(false)

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
    setRangeOpen(false)
  }

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
          <h2 className="w-28 text-center text-base font-bold tabular-nums" aria-live="polite">
            {y}年{m}月
          </h2>
          <button type="button" className={navBtn} onClick={() => moveMonth(1)} aria-label="次の月">
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
            実習 <b className="text-ink tabular-nums">{count('practice')}</b> ・ 休み{' '}
            <b className="text-ink tabular-nums">{count('off')}</b>
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="タップで付ける印"
          value={paint}
          onChange={setPaint}
          options={PAINT_OPTIONS}
        />

        {/* 1マス44px以上。360px 幅でも入るよう、カードに入れずに並べる */}
        <section aria-label={`${y}年${m}月のカレンダー`}>
          <div
            aria-hidden
            className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-ink-muted"
          >
            {WEEK_HEAD.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((key, i) =>
              key === null ? (
                <span key={`blank-${i}`} aria-hidden />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => tap(key)}
                  aria-label={`${shortDate(key)} ${schedule[key] ? KIND_NAME[schedule[key]] : 'ふだんの日'}${key === today ? '（今日）' : ''}`}
                  className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl text-sm leading-4 tabular-nums focus-visible:outline-2 focus-visible:outline-primary-ink ${
                    schedule[key] ? KIND_CELL[schedule[key]] : 'bg-surface text-ink hover:bg-paper'
                  } ${key === today ? 'font-bold ring-2 ring-ink ring-inset' : ''} ${key < today ? 'opacity-40' : ''}`}
                >
                  <span>{Number(key.slice(8))}</span>
                  <span aria-hidden className="h-4 text-xs font-bold">
                    {schedule[key] ? KIND_MARK[schedule[key]] : ''}
                  </span>
                </button>
              ),
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setRangeError(null)
              setRangeOpen(true)
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper"
          >
            <CalendarRange aria-hidden className="size-4" />
            期間でまとめて塗る
          </button>
          {rangeDone && (
            <p role="status" className="text-center text-sm text-ink-muted">
              {rangeDone}
            </p>
          )}
        </div>
      </div>

      <Sheet open={rangeOpen} title="期間でまとめて塗る" onClose={() => setRangeOpen(false)}>
        <form onSubmit={applyRange} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
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
          <button
            type="submit"
            className="min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong"
          >
            まとめて塗る
          </button>
        </form>
      </Sheet>

      <Sheet open={help} title="カレンダーの使い方" onClose={() => setHelp(false)}>
        <div className="flex flex-col gap-2 text-sm text-ink-muted">
          <p>
            実習の日と休みの日に印を付けておくと、締切までに使える時間をその日の予定で計算するよ。
          </p>
          <p>
            実習の日は<b className="text-ink">{formatHours(settings.hoursPractice)}</b>
            、印のない日は
            <b className="text-ink">{formatHours(settings.hoursNormal)}</b>
            、休みは<b className="text-ink">0h</b>で数えるね（時間はせっていで変えられるよ）。
          </p>
          <p>今日が実習の日なら、「実習中」も自動でオンになるよ。</p>
          <p>
            上の「実習・休み・消す」を選んでから日付をタップしてね。同じ印をもう一度タップすると外れるよ。
          </p>
        </div>
      </Sheet>
    </ScreenLayout>
  )
}
