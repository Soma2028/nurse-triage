import { TRIAGE_STYLE } from '../constants'
import type { Plan } from '../types'
import { formatHours } from '../utils/format'

interface Props {
  plan: Plan
  className?: string
}

const FREE_PATTERN =
  'bg-[repeating-linear-gradient(45deg,transparent_0_4px,var(--color-line-strong)_4px_8px)]'

export function TodayPlan({ plan, className = '' }: Props) {
  const { hours, items, free } = plan
  const pct = (h: number) => (hours > 0 ? `${(h / hours) * 100}%` : '0%')
  const showFree = free >= 0.05

  return (
    <section aria-labelledby="plan-heading" className={`ui-card p-4 ${className}`}>
      <div className="flex items-baseline justify-between">
        <h2 id="plan-heading" className="text-base font-bold">
          今日のプラン
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{formatHours(hours)}</span>
      </div>

      {hours === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">今日は休みの日。課題の割り振りはないよ。</p>
      ) : (
        <>
          {/* 積み上げバー（読み上げはリストに任せる） */}
          <div aria-hidden className="mt-2 flex h-2 gap-1 overflow-hidden rounded-full bg-line">
            {items.map((i) => (
              <div
                key={i.task.id}
                className={TRIAGE_STYLE[i.triage].bar}
                style={{ width: pct(i.hours) }}
              />
            ))}
            {showFree && <div className={FREE_PATTERN} style={{ width: pct(free) }} />}
          </div>

          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {items.map((i) => (
              <li key={i.task.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${TRIAGE_STYLE[i.triage].dot}`}
                />
                <span className="w-10 shrink-0 font-bold tabular-nums">{formatHours(i.hours)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {i.task.title}
                  <span className="sr-only">（{TRIAGE_STYLE[i.triage].name}）</span>
                </span>
                <span className="shrink-0 text-ink-muted tabular-nums">
                  {i.task.progress}%<span className="sr-only">進んだ</span>
                </span>
              </li>
            ))}
            {showFree && (
              <li className="flex items-center gap-2 text-ink-muted">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full border border-ink-muted"
                />
                <span className="w-10 shrink-0 font-bold tabular-nums">{formatHours(free)}</span>
                <span>空き。休むか、復習にあてよう</span>
              </li>
            )}
            {items.length === 0 && !showFree && (
              <li className="text-ink-muted">割り振る課題がないよ。</li>
            )}
          </ul>
        </>
      )}
    </section>
  )
}
