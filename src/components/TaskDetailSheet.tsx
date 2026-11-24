import type { Analysed } from '../types'
import { Sheet } from './Sheet'
import { TaskDetail } from './TaskDetail'

/**
 * 課題のくわしいシート（課題の一覧・ホームで共通）。
 * 完了・削除したら閉じる。+25% で100%になって完了したときも、一覧から消えるので閉じる
 */
export function TaskDetailSheet({
  analysed,
  openId,
  onClose,
  onAdvance,
  onComplete,
  onEdit,
  onRemove,
}: {
  analysed: Analysed[]
  openId: string | null
  onClose: () => void
  onAdvance: (id: string) => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}) {
  const index = openId ? analysed.findIndex((a) => a.task.id === openId) : -1
  const a = index >= 0 ? analysed[index] : null
  return (
    <Sheet open={a !== null} title="課題" onClose={onClose}>
      {a && (
        <TaskDetail
          a={a}
          rank={index + 1}
          onAdvance={() => onAdvance(a.task.id)}
          onComplete={() => {
            onComplete(a.task.id)
            onClose()
          }}
          onEdit={() => {
            onClose()
            onEdit(a.task.id)
          }}
          onRemove={() => {
            onRemove(a.task.id)
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}
