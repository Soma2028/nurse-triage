import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { readBackup } from '../store/backup'
import { useStore } from '../store/context'
import type { Persisted } from '../store/storage'
import { Group } from './Group'
import { Sheet } from './Sheet'

const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong'
const plainBtn =
  'min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper'

const READ_ERROR: Record<string, string> = {
  not_json: 'このファイルは読めなかったよ。書き出したファイルを選んでね。',
  not_backup: 'このアプリのバックアップではないみたい。',
  newer: '新しい版のアプリで書き出したファイルだよ。アプリを開き直してから読み込んでね。',
}

/** 「11/26(木) 10:00」 */
function formatAt(ms: number) {
  const d = new Date(ms)
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}(${w}) ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 件数の1行（部品ではなく、要素を返す関数） */
const countRow = (label: string, value: string) => (
  <div key={label} className="flex min-h-12 items-center justify-between px-4 text-base text-ink">
    <span>{label}</span>
    <span className="text-sm text-ink tabular-nums">{value}</span>
  </div>
)

/**
 * バックアップの読み込み（せっていのバックアップ・はじめの画面で共通）。
 * pick() でファイルを選ばせ、中身を確かめてシートで見せ、「置き換えて読み込む」で丸ごと置き換える。
 * element（見えない入力欄とシート）を画面のどこかに置く
 */
export function useBackupImport(onImported: () => void): {
  pick: () => void
  error: string | null
  element: ReactNode
} {
  const { dispatch } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ data: Persisted; exportedAt: number | null } | null>(
    null,
  )

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルをもう一度選べるように
    if (!file) return
    setError(null)
    const r = readBackup(await file.text())
    if (!r.ok) return setError(READ_ERROR[r.reason])
    setPending({ data: r.data, exportedAt: r.exportedAt })
  }

  const confirm = () => {
    if (!pending) return
    dispatch({ type: 'replaceAll', data: pending.data, now: Date.now() })
    setPending(null)
    onImported()
  }

  const element = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onFile}
      />
      <Sheet
        open={pending !== null}
        title="バックアップを読み込む"
        onClose={() => setPending(null)}
      >
        {pending && (
          <div className="flex flex-col gap-4">
            <Group>
              {countRow('課題', `${pending.data.tasks.length}件`)}
              {countRow('完了した課題', `${pending.data.done.length}件`)}
              {countRow('カレンダーの予定', `${Object.keys(pending.data.schedule).length}日`)}
              {pending.exportedAt !== null &&
                countRow('書き出した日', formatAt(pending.exportedAt))}
            </Group>
            <p className="px-4 text-sm leading-6 text-ink">
              いまの課題・予定・せっていは、このファイルの中身に置き換わるよ。
            </p>
            <button type="button" onClick={confirm} className={primaryBtn}>
              置き換えて読み込む
            </button>
            <button type="button" onClick={() => setPending(null)} className={plainBtn}>
              やめる
            </button>
          </div>
        )}
      </Sheet>
    </>
  )

  return {
    pick: () => {
      setError(null)
      inputRef.current?.click()
    },
    error,
    element,
  }
}
