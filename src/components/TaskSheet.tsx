import type { Task } from '../types'
import { Sheet } from './Sheet'
import { TaskForm } from './TaskForm'

interface Props {
  open: boolean
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  now: number
  /** 新規追加時の締切の初期値 */
  defaultDue?: number
  onSubmit: (task: Task) => void
  onClose: () => void
}

/** 課題の追加・編集（右下の＋や、課題カードの「編集」から開く） */
export function TaskSheet({ open, editing, now, defaultDue, onSubmit, onClose }: Props) {
  return (
    <Sheet
      open={open}
      title={editing ? '課題を編集' : '課題を追加'}
      onClose={onClose}
      focusFirstInput
    >
      <TaskForm
        key={editing?.id ?? `new-${defaultDue ?? ''}`}
        editing={editing}
        now={now}
        defaultDue={defaultDue}
        onSubmit={onSubmit}
      />
    </Sheet>
  )
}
