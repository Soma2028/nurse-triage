import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DURATION, EASE_OUT, baseTransition } from '../motion'
import type { Task } from '../types'
import { TaskForm } from './TaskForm'

interface Props {
  open: boolean
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  now: number
  onSubmit: (task: Task) => void
  onClose: () => void
}

/**
 * 課題の追加・編集パネル。スマホは画面下からせり上がり、PC は画面中央のダイアログ
 * （夢のタネの記録パネルと同じ作り）。
 */
export function TaskSheet({ open, editing, now, onSubmit, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Esc で閉じる・開いたら課題名にフォーカス・後ろの画面をスクロールさせない
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusId = window.setTimeout(
      () => panelRef.current?.querySelector<HTMLInputElement>('input')?.focus(),
      DURATION.base * 1000,
    )
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusId)
    }
  }, [open, onClose])

  const title = editing ? '課題を編集' : '課題を追加'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center wide:items-center">
          <motion.button
            type="button"
            aria-label="閉じる"
            data-no-tap
            tabIndex={-1}
            onClick={onClose}
            // 暗い幕だと iOS 26 の Safari が上下のバーを暗く塗るので、背景と同じ色を半透明で重ねる
            className="absolute inset-0 bg-paper/75 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={baseTransition}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-sheet-title"
            className="ui-card ui-card-raised relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] wide:rounded-b-3xl wide:pt-5"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line wide:hidden" />
            <div className="mb-3 flex items-center justify-between">
              <h2 id="task-sheet-title" className="text-lg font-bold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-paper"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <TaskForm
              key={editing?.id ?? 'new'}
              editing={editing}
              now={now}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
