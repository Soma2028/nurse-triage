import { useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { TaskForm } from './components/TaskForm'
import { TodayPlan } from './components/TodayPlan'
import { TaskList } from './components/TaskList'
import { buildPlan } from './logic/plan'
import { analyse, dailyHours, firstShortage } from './logic/priority'
import { useStore } from './store/context'
import type { Task } from './types'

export default function App() {
  const { state, dispatch, now } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const analysed = useMemo(
    () => analyse(state.tasks, state.settings, now),
    [state.tasks, state.settings, now],
  )
  const hours = dailyHours(state.settings)
  const plan = useMemo(() => buildPlan(analysed, hours), [analysed, hours])
  const redCount = analysed.filter((a) => a.triage === 'red').length
  const remainTotal = analysed.reduce((s, a) => s + a.remain, 0)
  const shortage = firstShortage(analysed)
  // 編集中の課題が完了・削除されたら、自動で新規追加フォームに戻る
  const editing = state.tasks.find((t) => t.id === editingId)

  const startEdit = (id: string) => {
    setEditingId(id)
    // 1カラム表示ではフォームが下にあるので、そこまでスクロールする
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      formRef.current?.querySelector('input')?.focus({ preventScroll: true })
    })
  }

  const submit = (task: Task) => {
    dispatch(editing ? { type: 'update', task } : { type: 'add', task })
    setEditingId(null)
  }

  return (
    <div className="min-h-dvh">
      <Header
        settings={state.settings}
        redCount={redCount}
        remainTotal={remainTotal}
        hours={hours}
        shortage={shortage}
        onTogglePractice={(on) => dispatch({ type: 'setSettings', patch: { practiceMode: on } })}
        onChangeHours={(h) =>
          dispatch({
            type: 'setSettings',
            patch: state.settings.practiceMode ? { hoursPractice: h } : { hoursNormal: h },
          })
        }
      />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 wide:grid-cols-[minmax(0,1fr)_22rem]">
        <TaskList
          analysed={analysed}
          editingId={editing?.id ?? null}
          onAdvance={(id) => dispatch({ type: 'advance', id, now: Date.now() })}
          onComplete={(id) => dispatch({ type: 'complete', id, now: Date.now() })}
          onEdit={startEdit}
          onRemove={(id) => dispatch({ type: 'remove', id, now: Date.now() })}
        />
        <aside className="flex flex-col gap-6">
          <TodayPlan plan={plan} />
          <div ref={formRef} className="scroll-mt-4">
            <TaskForm
              key={editing?.id ?? 'new'}
              editing={editing}
              now={now}
              onSubmit={submit}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}
