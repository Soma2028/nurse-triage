import { ChevronRight, ChevronsUpDown, Minus, Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatHours } from '../utils/format'

/** 行をまとめる白い面（iPhone の設定アプリのような一覧）。せってい・通知・課題の追加で共通 */
export function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {label && <h2 className="px-4 text-xs font-bold tracking-wide text-ink-muted">{label}</h2>}
      <div className="ui-card divide-y divide-line overflow-hidden rounded-2xl">{children}</div>
    </section>
  )
}

/** 行の左に置く小さなアイコンの枠。色は付けない（色を持つのはタッグだけ） */
export function IconTile({ icon: Icon, danger = false }: { icon: LucideIcon; danger?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-paper ${
        danger ? 'text-danger' : 'text-ink'
      }`}
    >
      <Icon className="size-4" strokeWidth={2} />
    </span>
  )
}

/** 押すとページやシートを開く行。左にアイコン、右に今の値と「›」 */
export function LinkRow({
  icon,
  label,
  value,
  strong = false,
  danger = false,
  disabled = false,
  chevron = !danger,
  onClick,
}: {
  icon?: LucideIcon
  label: ReactNode
  value?: ReactNode
  /** 右の値を太字にする（届いた申請など、見てほしいとき） */
  strong?: boolean
  /** 退会のような、取り消しにくい操作 */
  danger?: boolean
  disabled?: boolean
  chevron?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-base transition disabled:text-ink-muted ${
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-paper'
      }`}
    >
      {icon && <IconTile icon={icon} danger={danger} />}
      {/* 名前は切らずに出し、狭いときは右の値のほうを「…」で切る */}
      <span className="max-w-[70%] shrink-0 truncate">{label}</span>
      <span
        className={`min-w-0 flex-1 truncate text-right text-sm ${strong ? 'font-bold text-ink' : 'text-ink-muted'}`}
      >
        {value}
      </span>
      {chevron && <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />}
    </button>
  )
}

/** Group の中の1行。左に（アイコンと）名前、右に値や操作 */
export function Row({
  icon,
  label,
  htmlFor,
  children,
}: {
  /** 名前の左に置くアイコン（せっていの行と同じ色なしの枠） */
  icon?: LucideIcon
  label: ReactNode
  /** 右の入力欄の id。名前を押してもその欄に移るようにする */
  htmlFor?: string
  children: ReactNode
}) {
  const name = 'flex min-w-0 items-center gap-2 text-base text-ink'
  return (
    <div className="relative flex min-h-12 items-center justify-between gap-2 py-1 pr-2 pl-4 has-focus-visible:ring-2 has-focus-visible:ring-primary/25 has-focus-visible:ring-inset">
      <span className={`flex min-w-0 items-center gap-3 ${htmlFor ? 'shrink-0' : ''}`}>
        {icon && <IconTile icon={icon} />}
        {htmlFor ? (
          <label htmlFor={htmlFor} className={name}>
            {label}
          </label>
        ) : (
          <p className={name}>{label}</p>
        )}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  )
}

/**
 * Row の右に、選んだ値を文字で出す。children には ui-picker の select や input を入れ、行全体で押せるようにする。
 * 入力欄そのものの見た目（端末ごとにちがう）を出さず、課題のカードと同じ書き方で見せるため
 */
export function Picker({
  text,
  self = false,
  children,
}: {
  text: string
  /** 行にほかの操作（スイッチなど）もあるとき、押せる範囲をこの値の上だけにする */
  self?: boolean
  children: ReactNode
}) {
  const inner = (
    <>
      <span className="truncate text-base text-ink">{text}</span>
      <ChevronsUpDown aria-hidden className="mx-2 size-4 shrink-0 text-ink-muted" />
      {children}
    </>
  )
  return self ? (
    <span className="relative flex min-h-11 min-w-0 items-center rounded-2xl pl-2">{inner}</span>
  ) : (
    inner
  )
}

/** スイッチの見た目。つまみの位置は 2px 内側（h-6 の中に size-5） */
function Track({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
        on ? 'bg-primary' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow transition-transform motion-reduce:transition-none ${
          on ? 'translate-x-4' : ''
        }`}
      />
    </span>
  )
}

/** Row の右に置くスイッチ。つまみの右端を SwitchRow のスイッチとそろえる（押せる範囲は 56×44px） */
export function Switch({
  label,
  on,
  onToggle,
  disabled,
}: {
  label: string
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className="inline-flex h-11 w-14 shrink-0 items-center justify-end pr-2 disabled:opacity-60"
    >
      <Track on={on} />
    </button>
  )
}

/** 行全体がスイッチになっている行。note は名前の下に小さく出す補足 */
export function SwitchRow({
  icon,
  label,
  note,
  on,
  onToggle,
  disabled,
}: {
  icon?: LucideIcon
  label: string
  note?: ReactNode
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-paper disabled:opacity-60"
    >
      {icon && <IconTile icon={icon} />}
      <span className="min-w-0 flex-1">
        <span className="block text-base text-ink">{label}</span>
        {note && <span className="block text-xs text-ink-muted">{note}</span>}
      </span>
      <Track on={on} />
    </button>
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
