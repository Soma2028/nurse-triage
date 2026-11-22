import type { TargetAndTransition, Transition, Variants } from 'framer-motion'

/**
 * アプリ全体で共通のアニメーションの決まり（夢のタネの motion.ts と同じ値）。
 * 「視差効果を減らす」の人には App の MotionConfig reducedMotion="user" で控えめにする。
 */

/** 長さ（秒）。tap: 押したときの反応、base: 現れる・消える・パネルの開閉 */
export const DURATION = { tap: 0.15, base: 0.3 } as const

/** 動き出しは速く、止まり際をゆっくりにする緩み方（ease-out系） */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** 下から現れるときの距離（px） */
export const ENTER_DISTANCE = 16

/** 続けて現れる要素どうしの間隔（秒） */
export const STAGGER = 0.08

export const baseTransition: Transition = { duration: DURATION.base, ease: EASE_OUT }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: ENTER_DISTANCE },
  show: { opacity: 1, y: 0, transition: baseTransition },
}

/** 下から現れる。delay で順番をつける */
export function enter(delay = 0) {
  return {
    initial: { opacity: 0, y: ENTER_DISTANCE },
    animate: { opacity: 1, y: 0 },
    transition: { ...baseTransition, delay },
  }
}

/** 一覧のカード：画面に入ったら下から現れる。5枚目以降は同じ遅れ */
export function cardInView(index: number) {
  return {
    initial: { opacity: 0, y: ENTER_DISTANCE },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { ...baseTransition, delay: Math.min(index, 4) * STAGGER },
  }
}

/** キャラクターがふわふわ浮く動き */
export const float: { animate: TargetAndTransition; transition: Transition } = {
  animate: { y: [0, -6, 0], rotate: [-1, 1, -1] },
  transition: {
    y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
}
