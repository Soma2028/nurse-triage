import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { BottomNav, DesktopNav, type Screen } from './components/Nav'
import { RotateNotice } from './components/RotateNotice'
import { ScheduleScreen } from './components/ScheduleScreen'
import { loadAccountGroups } from './components/accountGroupsLoader'
import { SettingsScreen } from './components/SettingsScreen'
import { TaskSheet } from './components/TaskSheet'
import { TasksScreen } from './components/TasksScreen'
import { UndoToast } from './components/UndoToast'
import { buildPlan } from './logic/plan'
import { analyse, countByTriage, firstShortage } from './logic/priority'
import {
  autoPracticeToday,
  dayKey,
  hasUpcoming,
  isPracticeToday,
  todayHours,
} from './logic/schedule'
import { dayNote, homeView } from './logic/home'
import { baseTransition } from './motion'
import { usePendingInvite } from './social/invite'
import { computeProgress } from './social/progress'
import { useSocialAvailable } from './social/SocialContext'
import { useStore } from './store/context'
import { useNotifySync } from './sync/useNotifySync'
import type { Task } from './types'
import { formatDay } from './utils/format'

// 招待のシートは Clerk を使うので、招待リンクから開いたときだけ読み込む
const InviteSheet = lazy(() =>
  import('./components/InviteSheet').then((m) => ({ default: m.InviteSheet })),
)

// 進み具合を送る・通知の端末にログインを付ける部品も Clerk を使うので、ログインの機能が使えるときだけ読み込む
const SocialSync = lazy(() =>
  import('./components/SocialSync').then((m) => ({ default: m.SocialSync })),
)

/**
 * 起動してからこれだけたったら、せっていのプロフィールの部分（AccountGroups）を先に読み込む。
 * 初めてせっていを開いたとき、プロフィールの行が遅れて出て下の行がずれないように
 */
const PRELOAD_DELAY_MS = 1500

/** 追加・編集パネルの状態。editingId が null なら新規追加 */
type Sheet = { open: false } | { open: true; editingId: string | null; defaultDue?: number }

export default function App() {
  const { state, dispatch, now } = useStore()
  const [screen, setScreen] = useState<Screen>('home')
  useEffect(() => {
    const id = window.setTimeout(() => void loadAccountGroups().catch(() => {}), PRELOAD_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])
  const [sheet, setSheet] = useState<Sheet>({ open: false })
  const invite = usePendingInvite()
  const socialAvailable = useSocialAvailable()

  const { settings, schedule } = state
  // 通知をオンにしている端末だけ、課題の締切などを裏でサーバーに送る
  useNotifySync(state.tasks)
  const analysed = useMemo(
    () => analyse(state.tasks, settings, now, schedule),
    [state.tasks, settings, now, schedule],
  )
  const hours = todayHours(settings, schedule, now)
  const practice = isPracticeToday(settings, schedule, now)
  const practiceNote = !hasUpcoming(schedule, now)
    ? null
    : practice !== autoPracticeToday(schedule, now)
      ? '今日だけ手で切り替えてるよ'
      : schedule[dayKey(now)] === 'off'
        ? '今日は休みの日（スケジュールより）'
        : schedule[dayKey(now)] === 'test'
          ? '今日はテストの日（スケジュールより）'
          : practice
            ? '今日は実習の日（スケジュールより）'
            : '今日はふだんの日（スケジュールより）'
  const plan = useMemo(() => buildPlan(analysed, hours), [analysed, hours])
  // フレンドに見せる今日の進み具合（数だけ）
  const progress = useMemo(
    () => computeProgress(state.done, analysed, now),
    [state.done, analysed, now],
  )
  const counts = countByTriage(analysed)
  const shortage = firstShortage(analysed)
  const view = useMemo(() => homeView(analysed, plan), [analysed, plan])
  const editing =
    sheet.open && sheet.editingId ? state.tasks.find((t) => t.id === sheet.editingId) : undefined

  /** せっていの中のページにいるとき、下のタブの「せってい」をもう一度押すと一覧に戻す */
  const [settingsKey, setSettingsKey] = useState(0)
  const navigate = (s: Screen) => {
    if (s === 'settings' && screen === 'settings') setSettingsKey((k) => k + 1)
    setScreen(s)
  }
  /** 課題を追加する。カレンダーの日付から開いたときは、その日を締切の初期値にする */
  const openAdd = (defaultDue?: number) => setSheet({ open: true, editingId: null, defaultDue })
  const openEdit = (id: string) => setSheet({ open: true, editingId: id })
  const closeSheet = useCallback(() => setSheet({ open: false }), [])

  const submit = (task: Task) => {
    dispatch(editing ? { type: 'update', task } : { type: 'add', task })
    closeSheet()
  }

  const togglePractice = () => dispatch({ type: 'togglePracticeToday', now: Date.now() })
  const advance = (id: string) => dispatch({ type: 'advance', id, now: Date.now() })
  const complete = (id: string) => dispatch({ type: 'complete', id, now: Date.now() })
  const dismissUndo = useCallback(() => dispatch({ type: 'dismissUndo' }), [dispatch])

  return (
    // 画面の高さで固定。見出しとタブは動かず、各画面の真ん中だけがスクロールする
    <div className="flex h-full flex-col wide:pl-60">
      <DesktopNav current={screen} onNavigate={navigate} onAdd={() => openAdd()} />

      <main className="relative min-h-0 flex-1">
        {/* 画面の切り替えは位置を動かさず、透明度だけのフェード（夢のタネと同じ） */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ...baseTransition, duration: 0.15 }}
          >
            {screen === 'home' && (
              <HomeScreen
                date={formatDay(now)}
                dayNote={dayNote(settings, schedule, now)}
                analysed={analysed}
                view={view}
                plan={plan}
                redCount={counts.red}
                blackCount={counts.black}
                shortage={shortage}
                onAdvance={advance}
                onComplete={complete}
                onEdit={openEdit}
                onRemove={(id) => dispatch({ type: 'remove', id, now: Date.now() })}
                onAdd={() => openAdd()}
              />
            )}
            {screen === 'tasks' && (
              <TasksScreen
                analysed={analysed}
                done={state.done}
                shortage={shortage}
                onAdd={() => openAdd()}
                onAdvance={advance}
                onComplete={complete}
                onEdit={openEdit}
                onRemove={(id) => dispatch({ type: 'remove', id, now: Date.now() })}
                onRestore={(id) => dispatch({ type: 'restore', id })}
              />
            )}
            {screen === 'schedule' && (
              <ScheduleScreen
                schedule={schedule}
                now={now}
                analysed={analysed}
                onSetDays={(dates, kind) => dispatch({ type: 'setDays', dates, kind })}
                onAddTask={openAdd}
                onEditTask={openEdit}
              />
            )}
            {screen === 'settings' && (
              <SettingsScreen
                key={settingsKey}
                settings={settings}
                practice={practice}
                practiceNote={practiceNote}
                onTogglePractice={togglePractice}
                onChangeSettings={(patch) => dispatch({ type: 'setSettings', patch })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav current={screen} onNavigate={navigate} />

      <TaskSheet
        open={sheet.open}
        editing={editing}
        now={now}
        defaultDue={sheet.open ? sheet.defaultDue : undefined}
        onSubmit={submit}
        onClose={closeSheet}
      />

      {socialAvailable && (
        <Suspense fallback={null}>
          <SocialSync progress={progress} />
        </Suspense>
      )}

      {invite && (
        <Suspense fallback={null}>
          <InviteSheet />
        </Suspense>
      )}

      <RotateNotice />

      <UndoToast
        undo={state.undo}
        onUndo={() => dispatch({ type: 'undo' })}
        onDismiss={dismissUndo}
      />
    </div>
  )
}
