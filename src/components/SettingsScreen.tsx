import { ChevronRight, Minus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import type { Settings } from '../types'
import { formatHours } from '../utils/format'
import { PriorityHelp } from './Help'
import { NotifyPanel } from './NotifyPanel'
import { PracticeSwitch } from './PracticeSwitch'
import { ScreenLayout } from './ScreenLayout'
import { Sheet } from './Sheet'

interface Props {
  settings: Settings
  practice: boolean
  practiceNote: string | null
  onTogglePractice: () => void
  onChangeSettings: (patch: Partial<Settings>) => void
  onClearAll: () => void
}

const MIN_H = 0.5
const MAX_H = 16

const stepBtn =
  'inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-paper disabled:opacity-40'

/** 行をまとめる白い面（iPhone の設定アプリのような一覧） */
function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {label && <h2 className="px-4 text-xs font-bold tracking-wide text-ink-muted">{label}</h2>}
      <div className="ui-card divide-y divide-line overflow-hidden rounded-2xl">{children}</div>
    </section>
  )
}

/** 押すとシートを開く行 */
function LinkRow({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-base transition hover:bg-paper"
    >
      <span className="min-w-0 flex-1">{label}</span>
      {value && <span className="truncate text-sm text-ink-muted">{value}</span>}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </button>
  )
}

function HoursStepper({
  label,
  value,
  today,
  onChange,
}: {
  label: string
  value: number
  today: boolean
  onChange: (h: number) => void
}) {
  const step = (d: number) => onChange(Math.min(MAX_H, Math.max(MIN_H, value + d)))
  return (
    <div className="flex min-h-12 items-center justify-between gap-2 py-1 pr-2 pl-4">
      <p className="flex min-w-0 items-center gap-2 text-base">
        {label}
        {today && (
          <span className="rounded-full bg-primary-soft px-2 text-xs leading-5 font-bold text-primary-ink">
            今日
          </span>
        )}
      </p>
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
        <output className="w-12 text-center text-base font-bold tabular-nums" aria-live="polite">
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

type Open = 'notify' | 'priority' | null

/** せってい。実習期間中・1日に使える時間・通知・優先度の決め方・すべて消す */
export function SettingsScreen({
  settings,
  practice,
  practiceNote,
  onTogglePractice,
  onChangeSettings,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState<Open>(null)
  const notifyStatus = useNotifyStatus()
  const close = () => setOpen(null)

  return (
    <ScreenLayout title="せってい">
      <div className="flex flex-col gap-6">
        <Group>
          <div className="px-4 py-2">
            <PracticeSwitch on={practice} note={practiceNote} onToggle={onTogglePractice} />
          </div>
        </Group>

        <Group label="1日に使える時間">
          <HoursStepper
            label="実習中"
            value={settings.hoursPractice}
            today={practice}
            onChange={(h) => onChangeSettings({ hoursPractice: h })}
          />
          <HoursStepper
            label="ふだん"
            value={settings.hoursNormal}
            today={!practice}
            onChange={(h) => onChangeSettings({ hoursNormal: h })}
          />
        </Group>

        <Group>
          <LinkRow label="通知" value={notifyStatus} onClick={() => setOpen('notify')} />
          <LinkRow label="優先度の決め方" onClick={() => setOpen('priority')} />
        </Group>

        <Group>
          <button
            type="button"
            onClick={onClearAll}
            className="flex min-h-12 w-full items-center px-4 text-left text-base text-danger transition hover:bg-danger-soft"
          >
            すべて消す
          </button>
        </Group>
      </div>

      <Sheet open={open === 'notify'} title="通知" onClose={close}>
        <NotifyPanel />
      </Sheet>
      <Sheet open={open === 'priority'} title="優先度の決め方" onClose={close}>
        <PriorityHelp />
      </Sheet>
    </ScreenLayout>
  )
}
