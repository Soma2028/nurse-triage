import type { TodayClass } from '../logic/timetable'

/** 1列に並べる授業の数。これより多いときは3つずつで折り返す（1マスが狭くなりすぎないように） */
const ONE_ROW_MAX = 4

/**
 * ホームの「今日の時間割」。今日のプランと同じ、見出し入りの白いカード。
 * 授業を横に並べ（画面の幅で等分し、横にはスクロールしない。5コマ以上は3つずつで折り返す）、
 * いまの授業は薄い紺で塗り、終わった授業は薄くする
 */
export function TodayClasses({ classes }: { classes: TodayClass[] }) {
  const cols = classes.length <= ONE_ROW_MAX ? classes.length : 3
  return (
    <section aria-labelledby="classes-heading" className="ui-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="classes-heading" className="text-base font-bold">
          今日の時間割
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{classes.length}コマ</span>
      </div>
      <ol
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {classes.map(({ period, time, slot, state }) => (
          <li
            key={period}
            aria-label={`${period}限 ${time.start}〜${time.end} ${slot.name}${slot.room ? ` ${slot.room}` : ''}${
              state === 'now' ? '（いま）' : state === 'past' ? '（終わった）' : ''
            }`}
            className={`flex min-w-0 flex-col gap-1 rounded-2xl border p-2 ${
              state === 'now' ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
            } ${state === 'past' ? 'opacity-50' : ''}`}
          >
            <span aria-hidden className="flex items-baseline justify-between gap-1 text-xs">
              <b className={state === 'now' ? 'text-primary-ink' : 'text-ink'}>{period}限</b>
              {state === 'now' && <b className="text-primary-ink">いま</b>}
            </span>
            <span aria-hidden className="text-xs text-ink-muted tabular-nums">
              {time.start}
            </span>
            <span
              aria-hidden
              className="mt-1 line-clamp-3 text-sm leading-5 font-bold break-all text-ink"
            >
              {slot.name}
            </span>
            {slot.room && (
              <span aria-hidden className="truncate text-xs text-ink-muted">
                {slot.room}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
