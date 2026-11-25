import type { TodayClass } from '../logic/timetable'

/**
 * ホームの「今日の時間割」。今日のプランと同じ、見出し入りの白いカード。
 * いまの授業に「いま」の印を付け、終わった授業は薄くする
 */
export function TodayClasses({ classes }: { classes: TodayClass[] }) {
  return (
    <section aria-labelledby="classes-heading" className="ui-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="classes-heading" className="text-base font-bold">
          今日の時間割
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{classes.length}コマ</span>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {classes.map(({ period, time, slot, state }) => (
          <li
            key={period}
            className={`flex items-center gap-3 ${state === 'past' ? 'text-ink-muted' : 'text-ink'}`}
          >
            <span className="w-8 shrink-0 text-sm font-bold tabular-nums">{period}限</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{slot.name}</span>
              <span className="block truncate text-xs text-ink-muted tabular-nums">
                {time.start}〜{time.end}
                {slot.room && `・${slot.room}`}
              </span>
            </span>
            {state === 'now' && (
              <span className="shrink-0 rounded-full bg-primary-soft px-2 text-xs leading-5 font-bold text-primary-ink">
                いま
              </span>
            )}
            {state === 'past' && <span className="sr-only">終わった</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
