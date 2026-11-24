import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import type { Settings } from '../types'
import { Group, HoursStepper, Row, SwitchRow } from './Group'
import { CalendarHelp, HomeHelp, PriorityHelp } from './Help'
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

type Open = 'notify' | 'home' | 'priority' | 'calendar' | 'clear' | null

/** せってい。実習・1日に使える時間・通知・ヘルプ・データの見出しで分ける */
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
        <Group label="実習">
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

        <Group label="通知">
          <LinkRow label="通知" value={notifyStatus} onClick={() => setOpen('notify')} />
        </Group>

        <Group label="ヘルプ">
          <LinkRow label="ホームの見方" onClick={() => setOpen('home')} />
          <LinkRow label="優先度の決め方" onClick={() => setOpen('priority')} />
          <LinkRow label="カレンダーの使い方" onClick={() => setOpen('calendar')} />
        </Group>

        <Group label="データ">
          <button
            type="button"
            onClick={() => setOpen('clear')}
            className="flex min-h-12 w-full items-center px-4 text-left text-base text-danger transition hover:bg-danger-soft"
          >
            すべて消す
          </button>
        </Group>
      </div>

      {/* すべて消す前に、もう一度たずねる */}
      <Sheet open={open === 'clear'} title="課題をぜんぶ消す？" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            終わった課題も、まだの課題も、ぜんぶ消えるよ。消したあと5秒だけ、元に戻せるよ。
          </p>
          <button
            type="button"
            onClick={() => {
              close()
              onClearAll()
            }}
            className="min-h-12 rounded-full bg-danger text-base font-bold text-on-primary transition hover:opacity-90"
          >
            ぜんぶ消す
          </button>
          <button
            type="button"
            onClick={close}
            className="min-h-12 rounded-full border border-line bg-surface text-base font-bold text-ink transition hover:bg-paper"
          >
            やめる
          </button>
        </div>
      </Sheet>
      <Sheet open={open === 'notify'} title="通知" onClose={close}>
        <NotifyPanel />
      </Sheet>
      <Sheet open={open === 'home'} title="ホームの見方" onClose={close}>
        <HomeHelp />
      </Sheet>
      <Sheet open={open === 'priority'} title="優先度の決め方" onClose={close}>
        <PriorityHelp />
      </Sheet>
      <Sheet open={open === 'calendar'} title="カレンダーの使い方" onClose={close}>
        <CalendarHelp hoursPractice={settings.hoursPractice} hoursNormal={settings.hoursNormal} />
      </Sheet>
    </ScreenLayout>
  )
}
