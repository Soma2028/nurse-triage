import { Download, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { backupFileName, makeBackup, readBackup } from '../store/backup'
import { useStore } from '../store/context'
import type { Persisted } from '../store/storage'
import { Group, LinkRow } from './Group'
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

/**
 * せっていの「バックアップ」のページ。書き出す（共有の画面・ファイルの保存）と、読み込む（中身を見せてから置き換える）。
 * 端末の中だけで作り・読み、サーバーには送らない
 */
export function BackupPage() {
  const { state, dispatch } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<{ data: Persisted; exportedAt: number | null } | null>(
    null,
  )

  const exportBackup = async () => {
    setMessage(null)
    const now = Date.now()
    const name = backupFileName(now)
    const file = new File([makeBackup(state, now)], name, { type: 'application/json' })
    // iPhone は共有の画面から「"ファイル"に保存」や AirDrop で残せる
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // やめた
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage({ tone: 'info', text: `${name} を保存したよ。` })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルをもう一度選べるように
    if (!file) return
    setMessage(null)
    const r = readBackup(await file.text())
    if (!r.ok) return setMessage({ tone: 'error', text: READ_ERROR[r.reason] })
    setPending({ data: r.data, exportedAt: r.exportedAt })
  }

  const confirmImport = () => {
    if (!pending) return
    dispatch({ type: 'replaceAll', data: pending.data, now: Date.now() })
    setPending(null)
    setMessage({ tone: 'info', text: '読み込んだよ。' })
  }

  const scheduleCount = (d: Persisted) => Object.keys(d.schedule).length

  return (
    <div className="flex flex-col gap-2">
      <Group>
        <LinkRow icon={Download} label="書き出す" chevron={false} onClick={exportBackup} />
        <LinkRow
          icon={Upload}
          label="読み込む"
          chevron={false}
          onClick={() => inputRef.current?.click()}
        />
      </Group>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onFile}
      />
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`px-4 text-sm leading-6 ${message.tone === 'error' ? 'font-bold text-danger' : 'text-ink'}`}
        >
          {message.text}
        </p>
      )}
      <p className="px-4 text-xs leading-5 text-ink-muted">
        課題・カレンダーの予定・せっていを、1つのファイルにして残せるよ。機種を変えるときや、アプリを入れ直す前に書き出してね。ファイルには課題名も入るので、送る相手に気をつけてね。
      </p>

      <Sheet
        open={pending !== null}
        title="バックアップを読み込む"
        onClose={() => setPending(null)}
      >
        {pending && (
          <div className="flex flex-col gap-4">
            <Group>
              <div className="flex min-h-12 items-center justify-between px-4 text-base text-ink">
                <span>課題</span>
                <span className="text-sm text-ink tabular-nums">{pending.data.tasks.length}件</span>
              </div>
              <div className="flex min-h-12 items-center justify-between px-4 text-base text-ink">
                <span>完了した課題</span>
                <span className="text-sm text-ink tabular-nums">{pending.data.done.length}件</span>
              </div>
              <div className="flex min-h-12 items-center justify-between px-4 text-base text-ink">
                <span>カレンダーの予定</span>
                <span className="text-sm text-ink tabular-nums">
                  {scheduleCount(pending.data)}日
                </span>
              </div>
              {pending.exportedAt !== null && (
                <div className="flex min-h-12 items-center justify-between px-4 text-base text-ink">
                  <span>書き出した日</span>
                  <span className="text-sm text-ink tabular-nums">
                    {formatAt(pending.exportedAt)}
                  </span>
                </div>
              )}
            </Group>
            <p className="px-4 text-sm leading-6 text-ink">
              いまの課題・予定・せっていは、このファイルの中身に置き換わるよ。
            </p>
            <button type="button" onClick={confirmImport} className={primaryBtn}>
              置き換えて読み込む
            </button>
            <button type="button" onClick={() => setPending(null)} className={plainBtn}>
              やめる
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
