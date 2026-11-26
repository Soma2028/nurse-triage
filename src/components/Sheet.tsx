import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useKeyboardInset } from '../keyboardInset'
import { isEditing } from '../viewportFix'
import { DURATION, EASE_OUT, baseTransition } from '../motion'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** 開いたら最初の入力欄にフォーカスする（課題の追加・編集） */
  focusFirstInput?: boolean
}

/** これだけ下に引いたら（または速く引いたら）閉じる */
const CLOSE_OFFSET = 96
const CLOSE_VELOCITY = 600

/**
 * 画面の下からせり上がるシート（PC は中央のダイアログ）。
 * ✕・後ろの幕のタップ・Esc・上の取っ手を下に引く、のどれでも閉じる。中身が長ければシートの中だけスクロール。
 */
export function Sheet({ open, title, onClose, children, focusFirstInput = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useDragControls()
  // キーボードが出たら、その高さの分だけシートを持ち上げる（入力欄がキーボードの裏に隠れないように）
  const keyboard = useKeyboardInset(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const focusId = focusFirstInput
      ? window.setTimeout(
          () => panelRef.current?.querySelector<HTMLInputElement>('input')?.focus(),
          DURATION.base * 1000,
        )
      : undefined
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusId)
    }
  }, [open, onClose, focusFirstInput])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center wide:items-center"
          style={keyboard.inset ? { bottom: keyboard.inset } : undefined}
        >
          <motion.button
            type="button"
            aria-label="閉じる"
            data-no-tap
            tabIndex={-1}
            onClick={onClose}
            // 暗い幕だと iOS 26 の Safari が上下のバーを暗く塗るので、背景と同じ色を半透明で重ねる。
            // ぼかし（backdrop-blur）は使わない：全画面をぼかしたまま濃さを変えると iPhone で重く、
            // シートがせり上がる動きがもったりする
            className="absolute inset-0 bg-paper/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={baseTransition}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            // will-change: 動き出す前から別の層にしておき、せり上がりをなめらかにする
            className="ui-card ui-card-raised relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-b-none will-change-transform wide:max-w-md wide:rounded-b-3xl"
            // キーボードが出ている間は、見えている高さに収める（上がはみ出さないように）
            style={keyboard.inset ? { maxHeight: keyboard.visible - 16 } : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* 取っ手と見出し。ここを下に引くと閉じる */}
            <div
              className="shrink-0 cursor-grab touch-none px-4 pt-2 active:cursor-grabbing wide:pt-4"
              onPointerDown={(e) => drag.start(e)}
            >
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line wide:hidden" />
              <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
                <h2 className="text-base font-bold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="閉じる"
                  className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-paper"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </div>
            <div
              className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(24px,env(safe-area-inset-bottom))]"
              // 入力欄を押したら、キーボードが出きったあとで、その欄がシートの中で見える位置までずらす
              onFocus={(e) => {
                const el = e.target
                if (!isEditing(el)) return
                window.setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 350)
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
