interface Option<T> {
  value: T
  label: string
  /** ラベルの横に出す数（タブの件数など） */
  count?: number
}

interface Props<T> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
}

/** 丸い枠の中で1つを選ぶ切り替え（重要度・塗る種類・タブで共通） */
export function Segmented<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
  className = '',
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-1 rounded-full border border-line bg-surface p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-full px-2 text-sm font-bold transition ${
              active ? 'bg-primary text-on-primary' : 'text-ink-muted hover:bg-paper hover:text-ink'
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`ml-1 text-xs ${active ? 'opacity-80' : ''}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
