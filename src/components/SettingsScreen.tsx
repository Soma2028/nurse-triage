import { ChevronRight } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import type { Settings } from '../types'
import { Group, HoursStepper, Row, SwitchRow } from './Group'
import { CalendarHelp, HomeHelp, PriorityHelp } from './Help'
import { NotifyPanel } from './NotifyPanel'
import { ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'

// ログインまわりは Clerk を使うので、別のファイルに分けて必要なときだけ読み込む
const ProfileGroup = lazy(() =>
  import('./AccountGroups').then((m) => ({ default: m.ProfileGroup })),
)
const AccountRow = lazy(() => import('./AccountGroups').then((m) => ({ default: m.AccountRow })))

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

type Open = 'notify' | 'help' | 'clear' | null

type HelpTab = 'home' | 'priority' | 'calendar'

/**
 * せってい。まとまりは4つだけ：プロフィール／毎日の時間／通知・ヘルプ／アカウント・すべて消す。
 * 説明の文は画面に置かず、それぞれのシートの中に
 */
export function SettingsScreen({
  settings,
  practice,
  practiceNote,
  onTogglePractice,
  onChangeSettings,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState<Open>(null)
  const [helpTab, setHelpTab] = useState<HelpTab>('home')
  const notifyStatus = useNotifyStatus()
  const close = () => setOpen(null)

  return (
    <ScreenLayout title="せってい">
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <ProfileGroup />
        </Suspense>

        <Group label="毎日の時間">
          <SwitchRow
            label="実習期間中"
            note={practiceNote}
            on={practice}
            onToggle={onTogglePractice}
          />
          <Row label={<TodayLabel label="実習の日" today={practice} />}>
            <HoursStepper
              label="実習の日に使える時間"
              value={settings.hoursPractice}
              min={MIN_H}
              max={MAX_H}
              onChange={(h) => onChangeSettings({ hoursPractice: h })}
            />
          </Row>
          <Row label={<TodayLabel label="ふだんの日" today={!practice} />}>
            <HoursStepper
              label="ふだんの日に使える時間"
              value={settings.hoursNormal}
              min={MIN_H}
              max={MAX_H}
              onChange={(h) => onChangeSettings({ hoursNormal: h })}
            />
          </Row>
        </Group>

        <Group>
          <LinkRow label="通知" value={notifyStatus} onClick={() => setOpen('notify')} />
          <LinkRow label="ヘルプ" onClick={() => setOpen('help')} />
        </Group>

        <Group>
          <Suspense fallback={null}>
            <AccountRow />
          </Suspense>
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
      {/* ヘルプは1つのシートにまとめ、上の切り替えで見る */}
      <Sheet open={open === 'help'} title="ヘルプ" onClose={close}>
        <div className="flex flex-col gap-6">
          <Segmented
            label="ヘルプの項目"
            value={helpTab}
            onChange={setHelpTab}
            options={[
              { value: 'home', label: 'ホーム' },
              { value: 'priority', label: '優先度' },
              { value: 'calendar', label: 'カレンダー' },
            ]}
          />
          {helpTab === 'home' && <HomeHelp />}
          {helpTab === 'priority' && <PriorityHelp />}
          {helpTab === 'calendar' && (
            <CalendarHelp
              hoursPractice={settings.hoursPractice}
              hoursNormal={settings.hoursNormal}
            />
          )}
        </div>
      </Sheet>
    </ScreenLayout>
  )
}
