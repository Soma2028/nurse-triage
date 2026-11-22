import { useEffect } from 'react'
import type { UndoEntry } from '../store/reducer'

const SHOW_MS = 5000

interface Props {
  undo: UndoEntry | null
  onUndo: () => void
  onDismiss: () => void
}

/** 完了・削除・全消去のあと5秒間「元に戻す」を出す */
export function UndoToast({ undo, onUndo, onDismiss }: Props) {
  const at = undo?.at
  useEffect(() => {
    if (at == null) return
    const id = window.setTimeout(onDismiss, SHOW_MS)
    return () => window.clearTimeout(id)
  }, [at, onDismiss])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)] wide:pb-6 wide:pl-64"
    >
      {undo && (
        <div
          key={undo.at}
          role="status"
          className="pointer-events-auto flex max-w-md min-w-0 items-center gap-3 rounded-2xl bg-ink py-1.5 pr-1.5 pl-5 text-sm text-paper shadow-lg"
        >
          <span className="min-w-0 break-words">{undo.message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 shrink-0 rounded-full px-4 font-bold text-paper underline underline-offset-4 hover:bg-paper/10 focus-visible:outline-2 focus-visible:outline-primary-ink"
          >
            元に戻す
          </button>
        </div>
      )}
    </div>
  )
}
