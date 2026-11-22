import { useMemo, useState } from 'react'
import { TaskList } from './components/TaskList'
import { analyse } from './logic/priority'
import { useStore } from './store/context'

export default function App() {
  const { state, dispatch, now } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const analysed = useMemo(
    () => analyse(state.tasks, state.settings, now),
    [state.tasks, state.settings, now],
  )

  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <TaskList
          analysed={analysed}
          editingId={editingId}
          onAdvance={(id) => dispatch({ type: 'advance', id, now: Date.now() })}
          onComplete={(id) => dispatch({ type: 'complete', id, now: Date.now() })}
          onEdit={setEditingId}
          onRemove={(id) => dispatch({ type: 'remove', id, now: Date.now() })}
        />
      </main>
    </div>
  )
}
