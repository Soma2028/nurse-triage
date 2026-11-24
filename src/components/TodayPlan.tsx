import { ChevronRight } from 'lucide-react'
import { TRIAGE_STYLE } from '../constants'
import type { Plan } from '../types'
import { formatHours } from '../utils/format'
import { Group } from './Group'

interface Props {
  plan: Plan
  /** 課題の行を押したとき（その課題のくわしいページを開く） */
  onOpen: (id: string) => void
}

const FREE_PATTERN =
  'bg-[repeating-linear-gradient(45deg,transparent_0_4px,var(--color-line-strong)_4px_8px)]'

/** 今日のプラン。せっていと同じ「小見出し＋白い面の行」。いちばん上に積み上げバー、その下に課題の行 */
export function TodayPlan({ plan, onOpen }: Props) {
  const { hours, items, free } = plan
  const pct = (h: number) => (hours > 0 ? `${(h / hours) * 100}%` : '0%')
  const showFree = free >= 0.05

  return (
    <Group label="今日のプラン" aside={formatHours(hours)}>
      {hours === 0 ? (
        <p className="px-4 py-3 text-sm text-ink-muted">今日は休みの日。課題の割り振りはないよ。</p>
      ) : (
        <>
          {/* 積み上げバー（読み上げは下の行に任せる） */}
          <div aria-hidden className="px-4 py-3">
            <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-line">
              {items.map((i) => (
                <div
                  key={i.task.id}
                  className={TRIAGE_STYLE[i.triage].bar}
                  style={{ width: pct(i.hours) }}
                />
              ))}
              {showFree && <div className={FREE_PATTERN} style={{ width: pct(free) }} />}
            </div>
          </div>

          {items.map((i) => (
            <button
              key={i.task.id}
              type="button"
              onClick={() => onOpen(i.task.id)}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-paper"
            >
              <span
                aria-hidden
                className={`size-2 shrink-0 rounded-full ${TRIAGE_STYLE[i.triage].dot}`}
              />
              <span className="w-8 shrink-0 font-bold tabular-nums">{formatHours(i.hours)}</span>
              <span className="min-w-0 flex-1 truncate text-base text-ink">
                {i.task.title}
                <span className="sr-only">（{TRIAGE_STYLE[i.triage].name}）</span>
              </span>
              <span className="shrink-0 text-ink-muted tabular-nums">
                {i.task.progress}%<span className="sr-only">進んだ</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
            </button>
          ))}
          {showFree && (
            <p className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm text-ink-muted">
              <span aria-hidden className="size-2 shrink-0 rounded-full border border-ink-muted" />
              <span className="w-8 shrink-0 font-bold tabular-nums">{formatHours(free)}</span>
              <span>空き。休むか、復習にあてよう</span>
            </p>
          )}
          {items.length === 0 && !showFree && (
            <p className="px-4 py-3 text-sm text-ink-muted">割り振る課題がないよ。</p>
          )}
        </>
      )}
    </Group>
  )
}
