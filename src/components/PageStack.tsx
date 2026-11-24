import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import type { PointerEvent, ReactNode } from 'react'
import { pageSlide } from '../motion'

/** 画面の左端からこの幅の中で触り始めたら、右へのスワイプで一覧に戻る（iPhone の戻る操作と同じ） */
const EDGE = 24
/** これだけ右に引いたら（または速く引いたら）戻る。足りなければ元の位置に戻る */
const BACK_OFFSET = 96
const BACK_VELOCITY = 500

/**
 * 一覧と、そこから開くページを切り替えて出す（せってい・ホーム・課題で共通）。
 * ページは右から 16px すべり込み、戻るときは左から。ページでは画面の左端から右へスワイプしても戻る
 * （指に合わせて動き、足りなければ元の位置に戻る。シートが開いているときは動かさない）。
 * pageKey・dir・isTop・onBack は usePageNav から渡す
 */
export function PageStack({
  pageKey,
  dir,
  isTop,
  onBack,
  children,
}: {
  pageKey: string
  dir: number
  isTop: boolean
  onBack: () => void
  children: ReactNode
}) {
  const drag = useDragControls()

  const onPointerDown = (e: PointerEvent) => {
    if (isTop || e.pointerType !== 'touch' || e.clientX > EDGE) return
    if (document.querySelector('[role="dialog"]')) return
    drag.start(e)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > BACK_OFFSET || info.velocity.x > BACK_VELOCITY) onBack()
  }

  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={pageKey}
        className="h-full"
        custom={dir}
        variants={pageSlide}
        initial="enter"
        animate="show"
        exit="exit"
        // 横へのスワイプはこちらで受け取り、縦のスクロールはそのまま中身に任せる
        style={isTop ? undefined : { touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        drag={isTop ? false : 'x'}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 1 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
