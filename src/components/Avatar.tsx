import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { baseTransition } from '../motion'
import { ICONS, type ProfileIcon } from '../social/profile'

/**
 * プロフィールのアイコン（丸の中に絵か写真）。色は紺の薄い面だけ（タッグの色は使わない）。
 * 写真は長押しで保存などのメニューが出ないよう、押せないようにしてある（タップは外側に渡す）。
 * zoomable を付けると、写真をタップで大きく見られる（行全体が押せる場所では付けない）
 */
export function Avatar({
  icon,
  photo,
  size = 'md',
  zoomable = false,
}: {
  icon: ProfileIcon
  photo?: string | null
  size?: 'md' | 'lg'
  zoomable?: boolean
}) {
  const [zoom, setZoom] = useState(false)
  const { Icon, label } = ICONS[icon]
  const box = size === 'lg' ? 'size-12' : 'size-8'
  if (photo) {
    const img = (
      <img
        src={photo}
        alt="プロフィールの写真"
        className={`pointer-events-none shrink-0 rounded-full bg-primary-soft object-cover ${box}`}
      />
    )
    if (!zoomable) return img
    return (
      <>
        {/* 押せる範囲は 44px 以上にする（見た目は 48px の丸のまま） */}
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="写真を大きく見る"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full"
        >
          {img}
        </button>
        <PhotoZoom photo={zoom ? photo : null} onClose={() => setZoom(false)} />
      </>
    )
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink ${box}`}
    >
      <Icon aria-hidden className={size === 'lg' ? 'size-6' : 'size-4'} strokeWidth={2} />
    </span>
  )
}

/**
 * 写真を画面のまん中に大きく出す。どこをタップしても・Esc でも閉じる。
 * シートの中（動く面の中）からも開くので、body の直下に置く
 */
function PhotoZoom({ photo, onClose }: { photo: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!photo) return
    // シートの上で開いたとき、Esc でシートまで閉じないよう先に受け取って止める
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [photo, onClose])

  return createPortal(
    <AnimatePresence>
      {photo && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="プロフィールの写真"
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
          <motion.img
            src={photo}
            alt="プロフィールの写真"
            className="ui-card-raised pointer-events-none aspect-square w-[min(72vw,288px)] rounded-full bg-primary-soft object-cover"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            transition={baseTransition}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
