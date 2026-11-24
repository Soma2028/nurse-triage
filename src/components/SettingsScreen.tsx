import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import type { Settings } from '../types'
import { Group, HoursStepper, Row, SwitchRow } from './Group'
import { PriorityHelp } from './Help'
import { NotifyPanel } from './NotifyPanel'
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

/** 今日の分に「今日」の印を付けた名前 */
function TodayLabel({ label, today }: { label: string; today: boolean }) {
  return (
    <>
      {label}
      {today && (
        <span className="rounded-full bg-primary-soft px-2 text-xs leading-5 font-bold text-primary-ink">
          今日
        </span>
      )}
    </>
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
          <SwitchRow
            label="実習期間中"
            note={practiceNote}
            on={practice}
            onToggle={onTogglePractice}
          />
        </Group>

        <Group label="1日に使える時間">
          <Row label={<TodayLabel label="実習中" today={practice} />}>
            <HoursStepper
              label="実習中"
              value={settings.hoursPractice}
              min={MIN_H}
              max={MAX_H}
              onChange={(h) => onChangeSettings({ hoursPractice: h })}
            />
          </Row>
          <Row label={<TodayLabel label="ふだん" today={!practice} />}>
            <HoursStepper
              label="ふだん"
              value={settings.hoursNormal}
              min={MIN_H}
              max={MAX_H}
              onChange={(h) => onChangeSettings({ hoursNormal: h })}
            />
          </Row>
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
