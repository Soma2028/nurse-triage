import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { baseTransition } from '../motion'

/**
 * 写真や QR を画面のまん中に大きく出す。どこをタップしても・✕・Esc でも閉じる。
 * シートの中（動く面の中）からも開くので、body の直下に置く。open のとき children をふわっと大きくして出す
 */
export function Zoom({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean
  /** 読み上げ用の名前 */
  label: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    // シートの上で開いたとき、Esc でシートまで閉じないよう先に受け取って止める
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={onClose}
          // 暗い幕だと iOS の上下のバーが暗くなるので、シートと同じく生成り色を重ねる
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={baseTransition}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="absolute top-[max(16px,env(safe-area-inset-top))] right-[max(16px,env(safe-area-inset-right))] inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface"
          >
            <X aria-hidden className="size-5" />
          </button>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            transition={baseTransition}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
