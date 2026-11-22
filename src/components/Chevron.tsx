/** 折りたたみ用の矢印（<details> の中で開くと下向きに回る） */
export function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
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
