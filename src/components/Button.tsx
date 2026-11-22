import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary font-bold text-on-primary hover:bg-primary-strong',
  secondary: 'border border-line bg-surface text-ink hover:bg-paper',
  ghost: 'text-ink-muted hover:bg-paper',
  danger: 'text-danger hover:bg-danger-soft',
}

/** タップ領域 44px 以上のボタン。押したときに縮む動きを消さないよう transition（scale を含む）を使う */
export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}
