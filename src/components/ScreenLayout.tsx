import { ChevronLeft, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  /** 見出しの横に小さく出す一言（「今日は実習日」など） */
  note?: ReactNode
  /** 見出しの右に置くもの */
  aside?: ReactNode
  /** 見出しの下の1行（集計・タブ・月の切り替えなど）。ここまでは動かない */
  sub?: ReactNode
  /** 渡すと右下に＋ボタンを出す（スマホだけ。PC は左のメニューに追加ボタンがある） */
  onAdd?: () => void
  /** ＋ボタンの名前（読み上げ用） */
  addLabel?: string
  /** 渡すと見出しの左に「‹」を出す（せっていの中のページ） */
  onBack?: () => void
  /** 「‹」の名前（読み上げ用） */
  backLabel?: string
  /** 中身を真ん中の高さいっぱいに広げる（カレンダーのように、スクロールさせずに収める画面） */
  fill?: boolean
  children: ReactNode
}

/** 端の余白（16px。横向きの iPhone では safe-area の分も） */
const GUTTER = 'pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]'

/**
 * 画面の骨組み。見出しは固定し、真ん中だけがスクロールする（ページ全体は動かない）。
 */
export function ScreenLayout({
  title,
  note,
  aside,
  sub,
  onAdd,
  addLabel = '課題を追加する',
  onBack,
  backLabel = 'もどる',
  fill = false,
  children,
}: Props) {
  // 中身が見出しの下にスクロールして隠れているときだけ、見出しの下に区切りの線を出す
  const [scrolled, setScrolled] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 見出しは模様のない不透明な生成り色。半透明・ぼかし・影は使わない。
          sticky で上端に固定しておくと、iOS 26 が時計の帯をこの色で塗り、ぼかしを使わない（見た目は動かない） */}
      <header
        className={`sticky top-0 z-20 shrink-0 border-b bg-paper pt-[max(16px,env(safe-area-inset-top))] pb-2 transition-colors wide:pt-8 ${GUTTER} wide:px-8 ${
          scrolled ? 'border-line' : 'border-transparent'
        }`}
      >
        <div className="mx-auto max-w-xl">
          <div className="flex min-h-11 items-center justify-between gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="-ml-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-surface"
              >
                <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
              </button>
            )}
            <h1 className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="ui-page-title truncate">{title}</span>
              {note && <span className="truncate text-xs font-bold text-ink-muted">{note}</span>}
            </h1>
            {aside}
          </div>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          data-scroll
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          className={`h-full overflow-y-auto overscroll-contain pt-2 ${onAdd ? 'pb-24' : 'pb-6'} ${GUTTER} wide:px-8 wide:pb-8 ${fill ? 'flex flex-col' : ''}`}
        >
          <div className={`mx-auto w-full max-w-xl ${fill ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
            {children}
          </div>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addLabel}
            className="absolute right-[max(16px,env(safe-area-inset-right))] bottom-4 inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_8px_24px_rgb(29_63_110/0.3)] transition hover:bg-primary-strong wide:hidden"
          >
            <Plus aria-hidden className="size-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
