import { Bell, BookOpen, CircleHelp, Clock, House, Stethoscope } from 'lucide-react'
import { Suspense, useState, type ReactNode } from 'react'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import { TIMETABLE_ENABLED } from '../constants'
import type { ClassSlot, Period, Settings, Timetable } from '../types'
import { formatHours } from '../utils/format'
import { lazyAccountPart } from './accountGroupsLoader'
import { Group, HoursStepper, LinkRow, Row, SwitchRow } from './Group'
import { CalendarHelp, HomeHelp, PriorityHelp, PrivacyHelp } from './Help'
import { NotifyPanel } from './NotifyPanel'
import { PageStack } from './PageStack'
import { usePageNav } from './pageNav'
import { ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { TimetablePage } from './TimetablePage'

// ログインまわりは Clerk を使うので、別のファイルに分けて必要なときだけ読み込む
const ProfileGroup = lazyAccountPart((m) => m.ProfileGroup)
const AccountRow = lazyAccountPart((m) => m.AccountRow)
const FriendsPage = lazyAccountPart((m) => m.FriendsPage)
const AccountPage = lazyAccountPart((m) => m.AccountPage)

interface Props {
  settings: Settings
  practice: boolean
  practiceNote: string | null
  onTogglePractice: () => void
  onChangeSettings: (patch: Partial<Settings>) => void
  timetable: Timetable
  /** 今日の曜日（0=日〜6=土） */
  todayWeekday: number
  onSetClass: (weekday: number, period: number, slot: ClassSlot | null) => void
  onSetPeriod: (period: number, time: Period) => void
  onSetSaturday: (on: boolean) => void
  /** 最初に開くページ（ホームのフレンドの様子から来たときは 'friends'） */
  initialPage?: 'top' | 'friends'
}

const MIN_H = 0.5
const MAX_H = 16

/** せっていの中のページ。top が一覧で、ほかは一覧の行から開く */
type Page = 'top' | 'hours' | 'timetable' | 'notify' | 'help' | 'friends' | 'account'

const TITLES: Record<Page, string> = {
  top: 'せってい',
  hours: '使える時間',
  timetable: '時間割',
  notify: '通知',
  help: 'ヘルプ',
  friends: 'フレンド',
  account: 'アカウント',
}

type HelpTab = 'home' | 'priority' | 'calendar' | 'privacy'

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

/**
 * せってい。一覧（top）には行だけを並べ、押すとページが横からすべり込む。
 * 入力のフォーム（プロフィール・ログイン）はシートのまま
 */
export function SettingsScreen({
  settings,
  practice,
  practiceNote,
  onTogglePractice,
  onChangeSettings,
  timetable,
  todayWeekday,
  onSetClass,
  onSetPeriod,
  onSetSaturday,
  initialPage = 'top',
}: Props) {
  const { page, dir, go, back, isTop } = usePageNav<Page>('top', initialPage)
  const [helpTab, setHelpTab] = useState<HelpTab>('home')
  const notifyStatus = useNotifyStatus()

  const classCount = Object.keys(timetable.classes).length
  const hoursValue = `今日 ${formatHours(practice ? settings.hoursPractice : settings.hoursNormal)}`

  const top = (
    <ScreenLayout title={TITLES.top}>
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <ProfileGroup onOpenFriends={() => go('friends')} />
        </Suspense>

        <Group label="毎日の時間">
          <SwitchRow
            icon={Stethoscope}
            label="実習期間中"
            note={practiceNote}
            on={practice}
            onToggle={onTogglePractice}
          />
          <LinkRow icon={Clock} label="使える時間" value={hoursValue} onClick={() => go('hours')} />
          {TIMETABLE_ENABLED && (
            <LinkRow
              icon={BookOpen}
              label="時間割"
              value={classCount > 0 ? `${classCount}コマ` : 'まだないよ'}
              onClick={() => go('timetable')}
            />
          )}
        </Group>

        <Group>
          <LinkRow icon={Bell} label="通知" value={notifyStatus} onClick={() => go('notify')} />
          <LinkRow icon={CircleHelp} label="ヘルプ" onClick={() => go('help')} />
          {/* ログインしているときだけ出る */}
          <Suspense fallback={null}>
            <AccountRow onOpen={() => go('account')} />
          </Suspense>
        </Group>
      </div>
    </ScreenLayout>
  )

  /** 一覧から開いたページの骨組み。見出しの左の「‹」でせっていに戻る */
  const sub = (children: ReactNode, subRow?: ReactNode) => (
    <ScreenLayout title={TITLES[page]} onBack={back} backLabel="せっていにもどる" sub={subRow}>
      {children}
    </ScreenLayout>
  )

  let content
  switch (page) {
    case 'top':
      content = top
      break
    case 'hours':
      content = sub(
        <section className="flex flex-col gap-2">
          <Group label="1日に使える時間">
            <Row icon={Stethoscope} label={<TodayLabel label="実習の日" today={practice} />}>
              <HoursStepper
                label="実習の日に使える時間"
                value={settings.hoursPractice}
                min={MIN_H}
                max={MAX_H}
                onChange={(h) => onChangeSettings({ hoursPractice: h })}
              />
            </Row>
            <Row icon={House} label={<TodayLabel label="ふだんの日" today={!practice} />}>
              <HoursStepper
                label="ふだんの日に使える時間"
                value={settings.hoursNormal}
                min={MIN_H}
                max={MAX_H}
                onChange={(h) => onChangeSettings({ hoursNormal: h })}
              />
            </Row>
          </Group>
          <p className="px-4 text-xs leading-5 text-ink-muted">
            休みの日は0hで数えるよ。テストの日は、ふだんの日と同じだよ。
          </p>
        </section>,
      )
      break
    case 'timetable':
      content = sub(
        <TimetablePage
          timetable={timetable}
          todayWeekday={todayWeekday}
          onSetClass={onSetClass}
          onSetPeriod={onSetPeriod}
          onSetSaturday={onSetSaturday}
        />,
      )
      break
    case 'notify':
      content = sub(<NotifyPanel />)
      break
    case 'help':
      content = sub(
        <>
          {helpTab === 'home' && <HomeHelp />}
          {helpTab === 'priority' && <PriorityHelp />}
          {helpTab === 'privacy' && <PrivacyHelp />}
          {helpTab === 'calendar' && (
            <CalendarHelp
              hoursPractice={settings.hoursPractice}
              hoursNormal={settings.hoursNormal}
            />
          )}
        </>,
        <Segmented
          label="ヘルプの項目"
          value={helpTab}
          onChange={setHelpTab}
          options={[
            { value: 'home', label: 'ホーム' },
            { value: 'priority', label: '優先度' },
            // 360px で4つ並べても1行に収まるよう、短い名前にする
            { value: 'calendar', label: '予定' },
            { value: 'privacy', label: 'データ' },
          ]}
        />,
      )
      break
    case 'friends':
      content = sub(
        <Suspense fallback={null}>
          <FriendsPage onGone={back} />
        </Suspense>,
      )
      break
    case 'account':
      content = sub(
        <Suspense fallback={null}>
          <AccountPage onGone={back} />
        </Suspense>,
      )
      break
  }

  return (
    <PageStack pageKey={page} dir={dir} isTop={isTop} onBack={back}>
      {content}
    </PageStack>
  )
}
