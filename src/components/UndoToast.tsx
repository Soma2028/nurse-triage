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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {undo && (
        <div
          key={undo.at}
          role="status"
          className="pointer-events-auto flex max-w-md min-w-0 items-center gap-3 rounded-xl bg-slate-900 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          <span className="min-w-0 break-words">{undo.message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 shrink-0 rounded-lg px-3 font-bold text-sky-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sky-400 dark:text-sky-700 dark:hover:bg-slate-900/10"
          >
            元に戻す
          </button>
        </div>
      )}
    </div>
  )
}
