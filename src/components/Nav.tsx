import { CalendarDays, House, ListChecks, Plus, Settings2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type Screen = 'home' | 'tasks' | 'schedule' | 'settings'

const NAV_ITEMS: { key: Screen; label: string; icon: LucideIcon }[] = [
  { key: 'home', label: 'ホーム', icon: House },
  { key: 'tasks', label: '課題', icon: ListChecks },
  { key: 'schedule', label: 'カレンダー', icon: CalendarDays },
  { key: 'settings', label: 'せってい', icon: Settings2 },
]

interface NavProps {
  current: Screen
  onNavigate: (s: Screen) => void
}

/** スマホの下のタブ。画面の一番下に置き、iPhone の safe-area の分だけ下をあける（861px 以上では左のメニュー） */
export function BottomNav({ current, onNavigate }: NavProps) {
  return (
    <nav
      aria-label="メニュー"
      className="shrink-0 border-t border-line bg-surface pt-1 pr-[env(safe-area-inset-right)] pb-[max(8px,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] wide:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = current === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-12 min-w-0 flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                active ? 'text-primary-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon aria-hidden className="size-6" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** PC の左に常に出すメニュー。いちばん下に「課題を追加する」 */
export function DesktopNav({
  current,
  onNavigate,
  onAdd,
  footer,
}: NavProps & { onAdd: () => void; footer?: ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface/70 px-4 py-6 backdrop-blur wide:flex">
      <p className="px-3 text-base font-bold">看護課題トリアージ</p>

      <nav aria-label="メニュー" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = current === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition ${
                active
                  ? 'bg-primary-soft text-primary-ink'
                  : 'text-ink-muted hover:bg-paper hover:text-ink'
              }`}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {footer}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-on-primary shadow-sm transition hover:bg-primary-strong"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          課題を追加する
        </button>
      </div>
    </aside>
  )
}
