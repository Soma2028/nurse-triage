import { TASK_TYPES, TRIAGE_STYLE } from '../constants'
import type { Plan } from '../types'
import { formatHours } from '../utils/format'

export function TodayPlan({ plan }: { plan: Plan }) {
  const { hours, items, free } = plan
  const pct = (h: number) => (hours > 0 ? `${(h / hours) * 100}%` : '0%')
  const showFree = free >= 0.05

  return (
    <section
      aria-labelledby="plan-heading"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <h2 id="plan-heading" className="text-lg font-bold">
        今日のプラン
        <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {formatHours(hours)}
        </span>
      </h2>

      {hours === 0 && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          今日は休みの日です。課題の割り振りはありません。
        </p>
      )}

      {/* 積み上げバー（読み上げはリストに任せる） */}
      <div
        aria-hidden
        className="mt-3 flex h-6 gap-0.5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
      >
        {items.map((i) => (
          <div
            key={i.task.id}
            className={TRIAGE_STYLE[i.triage].bar}
            style={{ width: pct(i.hours) }}
            title={`${formatHours(i.hours)} ${i.task.title}`}
          />
        ))}
        {showFree && (
          <div
            className="bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(148_163_184/0.35)_4px_8px)]"
            style={{ width: pct(free) }}
          />
        )}
      </div>

      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {items.map((i) => (
          <li key={i.task.id} className="flex items-start gap-2">
            <span
              aria-hidden
              className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TRIAGE_STYLE[i.triage].dot}`}
            />
            <span className="w-10 shrink-0 font-bold tabular-nums">{formatHours(i.hours)}</span>
            <span className="min-w-0 break-words">
              {i.task.title}
              <span className="sr-only">（{TRIAGE_STYLE[i.triage].name}）</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {TASK_TYPES[i.task.type].label}
              </span>
            </span>
          </li>
        ))}
        {showFree && (
          <li className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
            <span
              aria-hidden
              className="mt-1.5 size-2.5 shrink-0 rounded-full border border-slate-400"
            />
            <span className="w-10 shrink-0 font-bold tabular-nums">{formatHours(free)}</span>
            <span>空き：休む・復習にあてる</span>
          </li>
        )}
      </ul>
    </section>
  )
}
