import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { BottomNav, DesktopNav, type Screen } from './components/Nav'
import { ScheduleScreen } from './components/ScheduleScreen'
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
import { homeSpeech } from './logic/speech'
import { baseTransition } from './motion'
import { useStore } from './store/context'
import { useNotifySync } from './sync/useNotifySync'
import type { Task } from './types'

/** 追加・編集パネルの状態。editingId が null なら新規追加 */
type Sheet = { open: false } | { open: true; editingId: string | null }

export default function App() {
  const { state, dispatch, now } = useStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [sheet, setSheet] = useState<Sheet>({ open: false })

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
        : practice
          ? '今日は実習の日（スケジュールより）'
          : '今日はふだんの日（スケジュールより）'
  const plan = useMemo(() => buildPlan(analysed, hours), [analysed, hours])
  const counts = countByTriage(analysed)
  const remainTotal = analysed.reduce((s, a) => s + a.remain, 0)
  const shortage = firstShortage(analysed)
  const speech = useMemo(() => homeSpeech(analysed, plan), [analysed, plan])
  const editing =
    sheet.open && sheet.editingId ? state.tasks.find((t) => t.id === sheet.editingId) : undefined

  const navigate = (s: Screen) => setScreen(s)
  const openAdd = () => setSheet({ open: true, editingId: null })
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
      <DesktopNav current={screen} onNavigate={navigate} onAdd={openAdd} />

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
                analysed={analysed}
                plan={plan}
                practice={practice}
                practiceNote={practiceNote}
                redCount={counts.red}
                blackCount={counts.black}
                remainTotal={remainTotal}
                speech={speech}
                onTogglePractice={togglePractice}
                onAdvance={advance}
                onComplete={complete}
                onAdd={openAdd}
                onOpenTasks={() => navigate('tasks')}
              />
            )}
            {screen === 'tasks' && (
              <TasksScreen
                analysed={analysed}
                done={state.done}
                shortage={shortage}
                onAdd={openAdd}
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
                settings={settings}
                now={now}
                onSetDays={(dates, kind) => dispatch({ type: 'setDays', dates, kind })}
              />
            )}
            {screen === 'settings' && (
              <SettingsScreen
                settings={settings}
                practice={practice}
                practiceNote={practiceNote}
                onTogglePractice={togglePractice}
                onChangeSettings={(patch) => dispatch({ type: 'setSettings', patch })}
                onClearAll={() => dispatch({ type: 'clearAll', now: Date.now() })}
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
        onSubmit={submit}
        onClose={closeSheet}
      />

      <UndoToast
        undo={state.undo}
        onUndo={() => dispatch({ type: 'undo' })}
        onDismiss={dismissUndo}
      />
    </div>
  )
}
