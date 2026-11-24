import { useEffect } from 'react'
import type { Analysed } from '../types'
import { ScreenLayout } from './ScreenLayout'
import { TaskDetail } from './TaskDetail'

/**
 * 課題のくわしいページ（ホーム・課題の一覧で共通）。一覧の行を押すと横からすべり込む。
 * 完了・削除して一覧から消えたら（スライダーで100%にしたときも）、一覧に戻る。編集のフォームはシートで上に開く
 */
export function TaskDetailPage({
  analysed,
  id,
  backLabel,
  onBack,
  onSetProgress,
  onComplete,
  onEdit,
  onRemove,
}: {
  analysed: Analysed[]
  id: string
  /** 「‹」の名前（読み上げ用。「ホームにもどる」など） */
  backLabel: string
  onBack: () => void
  onSetProgress: (id: string, progress: number) => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}) {
  const index = analysed.findIndex((a) => a.task.id === id)
  const a = index >= 0 ? analysed[index] : null

  useEffect(() => {
    if (!a) onBack()
  }, [a, onBack])

  return (
    <ScreenLayout title="課題" onBack={onBack} backLabel={backLabel}>
      {a && (
        <TaskDetail
          a={a}
          rank={index + 1}
          onSetProgress={(v) => onSetProgress(id, v)}
          onComplete={() => onComplete(id)}
          onEdit={() => onEdit(id)}
          onRemove={() => onRemove(id)}
        />
      )}
    </ScreenLayout>
  )
}
