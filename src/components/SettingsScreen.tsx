import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CircleHelp, Clock, Stethoscope, Trash2 } from 'lucide-react'
import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import { pageSlide } from '../motion'
import { useNotifyStatus } from '../sync/useNotifyStatus'
import type { Settings } from '../types'
import { formatHours } from '../utils/format'
import { Group, HoursStepper, LinkRow, Row, SwitchRow } from './Group'
import { CalendarHelp, HomeHelp, PriorityHelp } from './Help'
import { NotifyPanel } from './NotifyPanel'
import { ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'

// ログインまわりは Clerk を使うので、別のファイルに分けて必要なときだけ読み込む
const accountGroups = () => import('./AccountGroups')
const ProfileGroup = lazy(() => accountGroups().then((m) => ({ default: m.ProfileGroup })))
const AccountRow = lazy(() => accountGroups().then((m) => ({ default: m.AccountRow })))
const FriendsPage = lazy(() => accountGroups().then((m) => ({ default: m.FriendsPage })))
const AccountPage = lazy(() => accountGroups().then((m) => ({ default: m.AccountPage })))

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

/** せっていの中のページ。top が一覧で、ほかは一覧の行から開く */
type Page = 'top' | 'hours' | 'notify' | 'help' | 'friends' | 'account'

const TITLES: Record<Page, string> = {
  top: 'せってい',
  hours: '使える時間',
  notify: '通知',
  help: 'ヘルプ',
  friends: 'フレンド',
  account: 'アカウント',
}

type HelpTab = 'home' | 'priority' | 'calendar'

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
 * 入力のフォーム（プロフィール・ログイン）と、もう一度たずねる確認はシートのまま
 */
export function SettingsScreen({
  settings,
  practice,
  practiceNote,
  onTogglePractice,
  onChangeSettings,
  onClearAll,
}: Props) {
  const [page, setPage] = useState<Page>('top')
  /** 進むときは 1、戻るときは -1（すべり込む向き） */
  const [dir, setDir] = useState(1)
  const [clearOpen, setClearOpen] = useState(false)
  const [helpTab, setHelpTab] = useState<HelpTab>('home')
  const notifyStatus = useNotifyStatus()

  const go = (p: Page) => {
    setDir(1)
    setPage(p)
  }
  const back = useCallback(() => {
    setDir(-1)
    setPage('top')
  }, [])

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
        </Group>

        <Group>
          <LinkRow icon={Bell} label="通知" value={notifyStatus} onClick={() => go('notify')} />
          <LinkRow icon={CircleHelp} label="ヘルプ" onClick={() => go('help')} />
        </Group>

        <Group>
          <Suspense fallback={null}>
            <AccountRow onOpen={() => go('account')} />
          </Suspense>
          <LinkRow icon={Trash2} label="すべて消す" danger onClick={() => setClearOpen(true)} />
        </Group>
      </div>

      {/* すべて消す前に、もう一度たずねる */}
      <Sheet open={clearOpen} title="課題をぜんぶ消す？" onClose={() => setClearOpen(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            終わった課題も、まだの課題も、ぜんぶ消えるよ。消したあと5秒だけ、元に戻せるよ。
          </p>
          <button
            type="button"
            onClick={() => {
              setClearOpen(false)
              onClearAll()
            }}
            className="min-h-12 rounded-full bg-danger text-base font-bold text-on-primary transition hover:opacity-90"
          >
            ぜんぶ消す
          </button>
          <button
            type="button"
            onClick={() => setClearOpen(false)}
            className="min-h-12 rounded-full border border-line bg-surface text-base font-bold text-ink transition hover:bg-paper"
          >
            やめる
          </button>
        </div>
      </Sheet>
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
          <p className="px-4 text-xs leading-5 text-ink-muted">
            休みの日は0hで数えるよ。テストの日は、ふだんの日と同じだよ。
          </p>
        </section>,
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
            { value: 'calendar', label: 'カレンダー' },
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
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={page}
        className="h-full"
        custom={dir}
        variants={pageSlide}
        initial="enter"
        animate="show"
        exit="exit"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}
