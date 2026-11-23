import { useEffect } from 'react'
import type { UndoEntry } from '../store/reducer'
import { Chara } from './Chara'

const SHOW_MS = 5000

interface Props {
  undo: UndoEntry | null
  onUndo: () => void
  onDismiss: () => void
}

/**
 * 完了・削除・全消去のあと5秒間「元に戻す」を出す。完了したときはキャラクターがよろこぶ。
 * スマホでは下のタブの上・右下の＋ボタンにかからない位置に出す。
 */
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
      className="pointer-events-none fixed inset-x-0 bottom-[calc(max(8px,env(safe-area-inset-bottom))+64px)] z-50 flex justify-start pr-20 pl-4 wide:bottom-6 wide:justify-center wide:pr-4 wide:pl-64"
    >
      {undo && (
        <div
          key={undo.at}
          role="status"
          className="ui-card ui-card-raised pointer-events-auto flex max-w-md min-w-0 items-center gap-2 rounded-2xl py-1 pr-1 pl-3 text-sm"
        >
          {undo.kind === 'complete' && <Chara mood="happy" size={32} />}
          <span className="min-w-0 break-words">{undo.message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 shrink-0 rounded-full px-3 font-bold text-primary-ink hover:bg-primary-soft"
          >
            元に戻す
          </button>
        </div>
      )}
    </div>
  )
}
