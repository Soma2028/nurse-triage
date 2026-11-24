import { Smartphone } from 'lucide-react'

/**
 * スマホを横にしたときだけ、画面全体に「縦にして使ってね」を出す（CSS だけで切り替える）。
 * iPhone はホーム画面のアプリでも向きを固定できないため。Android は manifest の portrait で固定される
 */
export function RotateNotice() {
  return (
    <div className="fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-4 bg-paper px-8 text-center landscape-phone:flex">
      <Smartphone aria-hidden className="size-12 text-primary-ink" strokeWidth={1.75} />
      <p className="text-base font-bold text-ink">縦にして使ってね</p>
    </div>
  )
}
