import { Minus, Plus } from 'lucide-react'
import type { Settings } from '../types'
import { formatHours } from '../utils/format'
import { HowItWorks } from './HowItWorks'
import { PageTitle } from './PageTitle'
import { PracticeSwitch } from './PracticeSwitch'

interface Props {
  settings: Settings
  practice: boolean
  practiceNote: string | null
  onTogglePractice: () => void
  onChangeSettings: (patch: Partial<Settings>) => void
  onResetSample: () => void
  onClearAll: () => void
}

const MIN_H = 0.5
const MAX_H = 16

const stepBtn =
  'inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-paper disabled:opacity-40'

function HoursStepper({
  label,
  hint,
  value,
  active,
  onChange,
}: {
  label: string
  hint: string
  value: number
  active: boolean
  onChange: (h: number) => void
}) {
  const step = (d: number) => onChange(Math.min(MAX_H, Math.max(MIN_H, value + d)))
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-bold">
          {label}
          {active && (
            <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-ink">
              今日
            </span>
          )}
        </p>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
        <button
          type="button"
          className={stepBtn}
          onClick={() => step(-0.5)}
          disabled={value <= MIN_H}
          aria-label={`${label}を30分減らす`}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <output className="w-12 text-center text-lg font-bold tabular-nums" aria-live="polite">
          {formatHours(value)}
        </output>
        <button
          type="button"
          className={stepBtn}
          onClick={() => step(0.5)}
          disabled={value >= MAX_H}
          aria-label={`${label}を30分増やす`}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function SettingsScreen({
  settings,
  practice,
  practiceNote,
  onTogglePractice,
  onChangeSettings,
  onResetSample,
  onClearAll,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle>せってい</PageTitle>

      <div className="grid grid-cols-1 items-start gap-4 two:grid-cols-2">
        <div className="flex flex-col gap-4">
          <section className="ui-card px-4 py-2">
            <PracticeSwitch
              variant="row"
              on={practice}
              note={practiceNote}
              onToggle={onTogglePractice}
            />
          </section>

          <section className="ui-card px-4 py-1" aria-labelledby="hours-heading">
            <h2 id="hours-heading" className="ui-section-label pt-3">
              1日に使える時間
            </h2>
            <div className="divide-y divide-line">
              <HoursStepper
                label="実習中"
                hint="実習の日や実習期間に"
                value={settings.hoursPractice}
                active={practice}
                onChange={(h) => onChangeSettings({ hoursPractice: h })}
              />
              <HoursStepper
                label="ふだん"
                hint="授業の日や休み明けに"
                value={settings.hoursNormal}
                active={!practice}
                onChange={(h) => onChangeSettings({ hoursNormal: h })}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <HowItWorks />

          <section className="ui-card p-4" aria-labelledby="data-heading">
            <h2 id="data-heading" className="ui-section-label">
              データ
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              課題はこの端末の中だけに保存されるよ。消しても5秒間は元に戻せるよ。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResetSample}
                className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper"
              >
                サンプルに戻す
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="min-h-11 rounded-full px-4 text-sm font-bold text-danger transition hover:bg-danger-soft"
              >
                すべて消す
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
