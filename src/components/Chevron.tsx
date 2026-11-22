const DIRECTION = {
  /** 折りたたみ用：<details> が開くと下向きに回る */
  disclosure: 'transition-transform group-open:rotate-90 motion-reduce:transition-none',
  right: '',
  left: 'rotate-180',
} as const

/** 矢印アイコン（絵文字を使わないための SVG） */
export function Chevron({ direction = 'disclosure' }: { direction?: keyof typeof DIRECTION }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`size-4 shrink-0 ${DIRECTION[direction]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4l6 6-6 6" />
    </svg>
  )
}
