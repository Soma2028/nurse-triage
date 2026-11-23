import type { Task } from '../types'
import { Sheet } from './Sheet'
import { TaskForm } from './TaskForm'

interface Props {
  open: boolean
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  now: number
  onSubmit: (task: Task) => void
  onClose: () => void
}

/** 課題の追加・編集（右下の＋や、課題カードの「編集」から開く） */
export function TaskSheet({ open, editing, now, onSubmit, onClose }: Props) {
  return (
    <Sheet
      open={open}
      title={editing ? '課題を編集' : '課題を追加'}
      onClose={onClose}
      focusFirstInput
    >
      <TaskForm key={editing?.id ?? 'new'} editing={editing} now={now} onSubmit={onSubmit} />
    </Sheet>
  )
}
