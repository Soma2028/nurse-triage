import { TRIAGE_STYLE } from '../constants'
import type { Plan } from '../types'
import { formatHours } from '../utils/format'

interface Props {
  plan: Plan
  /** リストに出す件数（ホームでは1画面に収めるため絞る）。バーは常に全部 */
  limit?: number
  className?: string
}

const FREE_PATTERN =
  'bg-[repeating-linear-gradient(45deg,transparent_0_4px,var(--color-line-strong)_4px_8px)]'

export function TodayPlan({ plan, limit, className = '' }: Props) {
  const { hours, items, free } = plan
  const pct = (h: number) => (hours > 0 ? `${(h / hours) * 100}%` : '0%')
  const showFree = free >= 0.05
  const shown = limit != null ? items.slice(0, limit) : items
  const hidden = items.length - shown.length

  return (
    <section aria-labelledby="plan-heading" className={`ui-card p-4 ${className}`}>
      <div className="flex items-baseline justify-between">
        <h2 id="plan-heading" className="ui-card-title">
          今日のプラン
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{formatHours(hours)}</span>
      </div>

      {hours === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">今日は休みの日。課題の割り振りはないよ。</p>
      ) : (
        <>
          {/* 積み上げバー（読み上げはリストに任せる） */}
          <div aria-hidden className="mt-2.5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-line">
            {items.map((i) => (
              <div
                key={i.task.id}
                className={TRIAGE_STYLE[i.triage].bar}
                style={{ width: pct(i.hours) }}
              />
            ))}
            {showFree && <div className={FREE_PATTERN} style={{ width: pct(free) }} />}
          </div>

          <ul className="mt-2.5 flex flex-col gap-1.5 text-sm">
            {shown.map((i) => (
              <li key={i.task.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2.5 shrink-0 rounded-full ${TRIAGE_STYLE[i.triage].dot}`}
                />
                <span className="w-9 shrink-0 font-bold tabular-nums">{formatHours(i.hours)}</span>
                <span className="min-w-0 truncate">
                  {i.task.title}
                  <span className="sr-only">（{TRIAGE_STYLE[i.triage].name}）</span>
                </span>
              </li>
            ))}
            {hidden > 0 && <li className="pl-[1.125rem] text-xs text-ink-muted">ほか{hidden}件</li>}
            {showFree && (
              <li className="flex items-center gap-2 text-ink-muted">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full border border-ink-muted"
                />
                <span className="w-9 shrink-0 font-bold tabular-nums">{formatHours(free)}</span>
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
