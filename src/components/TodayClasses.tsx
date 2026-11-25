import type { TodayClass } from '../logic/timetable'

/**
 * ホームの「今日の時間割」。大きなカードにせず、小見出しと「1限 成人看護学概論」の小さな札を
 * 横に並べるだけ（入りきらなければ次の行へ）。いまの授業は薄い紺で塗り、終わった授業は薄くする。
 * 時刻・教室は読み上げとせっていの時間割のページに任せる
 */
export function TodayClasses({ classes }: { classes: TodayClass[] }) {
  return (
    <section aria-labelledby="classes-heading" className="flex flex-col gap-2">
      <h2 id="classes-heading" className="text-xs font-bold tracking-wide text-ink-muted">
        今日の時間割
      </h2>
      <ol className="flex flex-wrap gap-2">
        {classes.map(({ period, time, slot, state }) => (
          <li
            key={period}
            aria-label={`${period}限 ${time.start}〜${time.end} ${slot.name}${slot.room ? ` ${slot.room}` : ''}${
              state === 'now' ? '（いま）' : state === 'past' ? '（終わった）' : ''
            }`}
            className={`flex h-8 max-w-full min-w-0 items-center gap-2 rounded-full border px-3 text-sm ${
              state === 'now'
                ? 'border-primary bg-primary-soft text-primary-ink'
                : 'border-line bg-surface text-ink'
            } ${state === 'past' ? 'opacity-50' : ''}`}
          >
            <b aria-hidden className="shrink-0 text-xs tabular-nums">
              {period}限
            </b>
            <span aria-hidden className="truncate">
              {slot.name}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
