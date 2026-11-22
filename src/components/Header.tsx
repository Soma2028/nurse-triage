import type { Analysed, Settings } from '../types'
import { formatHours } from '../utils/format'
import { OverloadWarning } from './OverloadWarning'

interface Props {
  settings: Settings
  redCount: number
  remainTotal: number
  hours: number
  shortage: Analysed | undefined
  onTogglePractice: (on: boolean) => void
  onChangeHours: (hours: number) => void
}

const MIN_H = 0.5
const MAX_H = 16

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/10 px-2 py-2 text-center sm:px-3">
      <dt className="text-xs text-white/80">{label}</dt>
      <dd className="mt-0.5 font-heading text-2xl leading-none font-black tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-bold">{unit}</span>}
      </dd>
    </div>
  )
}

export function Header({
  settings,
  redCount,
  remainTotal,
  hours,
  shortage,
  onTogglePractice,
  onChangeHours,
}: Props) {
  const { practiceMode } = settings
  const step = (d: number) => onChangeHours(Math.min(MAX_H, Math.max(MIN_H, hours + d)))
  const stepBtn =
    'inline-flex size-11 items-center justify-center rounded-lg bg-white/15 text-xl font-bold hover:bg-white/25 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-white'

  return (
    <header className="bg-navy text-white dark:bg-navy-deep">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-wide sm:text-3xl">看護課題トリアージ</h1>
            <p className="mt-1 text-sm text-white/85">
              締切・残りの作業量・使える時間から、いま手をつける課題を赤・黄・緑で並べます。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              role="switch"
              aria-checked={practiceMode}
              onClick={() => onTogglePractice(!practiceMode)}
              className="-ml-1 flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-white"
            >
              <span
                aria-hidden
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  practiceMode ? 'bg-tag-yellow' : 'bg-white/30'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${
                    practiceMode ? 'translate-x-5' : ''
                  }`}
                />
              </span>
              実習期間中
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span id="hours-label" className="font-medium">
                1日に使える時間
                <span className="block text-xs text-white/75">
                  （{practiceMode ? '実習中' : '通常期'}）
                </span>
              </span>
              <div className="flex items-center gap-1" role="group" aria-labelledby="hours-label">
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => step(-0.5)}
                  disabled={hours <= MIN_H}
                  aria-label="30分減らす"
                >
                  −
                </button>
                <output
                  className="w-12 text-center font-heading text-xl font-black tabular-nums"
                  aria-live="polite"
                >
                  {formatHours(hours)}
                </output>
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => step(0.5)}
                  disabled={hours >= MAX_H}
                  aria-label="30分増やす"
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="赤タッグ" value={String(redCount)} unit="件" />
          <Stat label="残り作業の合計" value={formatHours(remainTotal).replace('h', '')} unit="h" />
          <Stat label="今日使える時間" value={formatHours(hours).replace('h', '')} unit="h" />
        </dl>

        <OverloadWarning a={shortage} />
      </div>
    </header>
  )
}
