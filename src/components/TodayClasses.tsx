import type { TodayClass } from '../logic/timetable'
import { Phrase } from './Phrase'

/**
 * ホームの「今日の時間割」。今日のプランと同じ、見出し入りの白いカード。
 * 授業を2つずつ横に並べる（横にはスクロールしない）。1マスを狭くしすぎると、
授業名が「成人看護/学概論」のように変なところで切れるため、名前が1行に入りやすい2列にしている。
 * いまの授業は薄い紺で塗り、終わった授業は薄くする
 */
export function TodayClasses({ classes }: { classes: TodayClass[] }) {
  return (
    <section aria-labelledby="classes-heading" className="ui-card ui-text p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="classes-heading" className="text-base font-bold">
          今日の時間割
        </h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">{classes.length}コマ</span>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2">
        {classes.map(({ period, time, slot, state }) => (
          <li
            key={period}
            aria-label={`${period}限 ${time.start}〜${time.end} ${slot.name}${slot.room ? ` ${slot.room}` : ''}${
              state === 'now' ? '（いま）' : state === 'past' ? '（終わった）' : ''
            }`}
            className={`flex min-w-0 flex-col gap-1 rounded-2xl border px-3 py-2 ${
              state === 'now' ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
            } ${state === 'past' ? 'opacity-50' : ''}`}
          >
            <span aria-hidden className="flex items-baseline justify-between gap-2 text-xs">
              <b className={state === 'now' ? 'text-primary-ink' : 'text-ink'}>{period}限</b>
              {state === 'now' && <b className="text-primary-ink">いま</b>}
            </span>
            <span aria-hidden className="line-clamp-2 text-sm leading-5 font-bold text-ink">
              <Phrase text={slot.name} />
            </span>
            <span aria-hidden className="truncate text-xs text-ink-muted tabular-nums">
              {time.start}〜{time.end}
              {slot.room && `・${slot.room}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
