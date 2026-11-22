import { useMemo, useRef, useState } from 'react'
import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import { analyse } from './logic/priority'
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
