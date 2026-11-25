import type { TodayClass } from '../logic/timetable'

/**
 * ホームの「今日の時間割」。今日のプランと同じ、見出し入りの白いカードに1コマ1行。
 * 「1限／9:00／授業名」の列をそろえ、名前は1行で切る。
 * いまの授業は名前を太字にして右に「いま」、終わった授業は薄くする。教室は読み上げとせっていの時間割のページ。
 * 行を押すと、そのコマの授業名・教室を変えるシートが開く（onEdit）
 */
export function TodayClasses({
  classes,
  onEdit,
}: {
  classes: TodayClass[]
  onEdit: (c: TodayClass) => void
}) {
  return (
    <section aria-labelledby="classes-heading" className="ui-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="classes-heading" className="text-base font-bold">
          今日の時間割
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{classes.length}コマ</span>
      </div>
      <ol className="mt-2 -mx-2 flex flex-col text-sm">
        {classes.map((c) => {
          const { period, time, slot, state } = c
          return (
            <li key={period}>
              <button
                type="button"
                onClick={() => onEdit(c)}
                aria-label={`${period}限 ${time.start}〜${time.end} ${slot.name}${slot.room ? ` ${slot.room}` : ''}${
                  state === 'now' ? '（いま）' : state === 'past' ? '（終わった）' : ''
                }を変える`}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left transition hover:bg-paper ${
                  state === 'past' ? 'text-ink-muted' : 'text-ink'
                }`}
              >
                <b aria-hidden className="w-8 shrink-0 tabular-nums">
                  {period}限
                </b>
                <span aria-hidden className="w-12 shrink-0 text-right tabular-nums">
                  {time.start}
                </span>
                <span
                  aria-hidden
                  className={`ml-2 min-w-0 flex-1 truncate ${state === 'now' ? 'font-bold' : ''}`}
                >
                  {slot.name}
                </span>
                {state === 'now' && (
                  <span
                    aria-hidden
                    className="shrink-0 rounded-full bg-primary-soft px-2 text-xs leading-5 font-bold text-primary-ink"
                  >
                    いま
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
