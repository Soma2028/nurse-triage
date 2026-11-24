import { ChevronsUpDown, Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatHours } from '../utils/format'

/** 行をまとめる白い面（iPhone の設定アプリのような一覧）。せってい・課題の追加で共通 */
export function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {label && <h2 className="px-4 text-xs font-bold tracking-wide text-ink-muted">{label}</h2>}
      <div className="ui-card divide-y divide-line overflow-hidden rounded-2xl">{children}</div>
    </section>
  )
}

/** Group の中の1行。左に名前、右に値や操作 */
export function Row({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode
  /** 右の入力欄の id。名前を押してもその欄に移るようにする */
  htmlFor?: string
  children: ReactNode
}) {
  const name = 'flex min-w-0 items-center gap-2 text-base text-ink'
  return (
    <div className="relative flex min-h-12 items-center justify-between gap-2 py-1 pr-2 pl-4 has-focus-visible:ring-2 has-focus-visible:ring-primary/25 has-focus-visible:ring-inset">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={`${name} shrink-0`}>
          {label}
        </label>
      ) : (
        <p className={name}>{label}</p>
      )}
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  )
}

/**
 * Row の右に、選んだ値を文字で出す。children には ui-picker の select や input を入れ、行全体で押せるようにする。
 * 入力欄そのものの見た目（端末ごとにちがう）を出さず、課題のカードと同じ書き方で見せるため
 */
export function Picker({ text, children }: { text: string; children: ReactNode }) {
  return (
    <>
      <span className="truncate text-base text-ink">{text}</span>
      <ChevronsUpDown aria-hidden className="mx-2 size-4 shrink-0 text-ink-muted" />
      {children}
    </>
  )
}

const stepBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-paper disabled:opacity-40'

/** 時間を30分ずつ増やす・減らす（Row の右に置く） */
export function HoursStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (h: number) => void
}) {
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)))
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={stepBtn}
        onClick={() => step(-0.5)}
        disabled={value <= min}
        aria-label={`${label}を30分減らす`}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <output className="w-12 text-center text-base font-bold tabular-nums" aria-live="polite">
        {formatHours(value)}
      </output>
      <button
        type="button"
        className={stepBtn}
        onClick={() => step(0.5)}
        disabled={value >= max}
        aria-label={`${label}を30分増やす`}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  )
}
