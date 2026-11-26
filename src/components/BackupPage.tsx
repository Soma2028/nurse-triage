import { Download, Upload } from 'lucide-react'
import { useState } from 'react'
import { backupFileName, makeBackup } from '../store/backup'
import { useStore } from '../store/context'
import { useBackupImport } from './backupImport'
import { Group, LinkRow } from './Group'

/**
 * せっていの「バックアップ」のページ。書き出す（共有の画面・ファイルの保存）と、読み込む（中身を見せてから置き換える）。
 * 端末の中だけで作り・読み、サーバーには送らない
 */
export function BackupPage() {
  const { state } = useStore()
  const [message, setMessage] = useState<string | null>(null)
  const importer = useBackupImport(() => setMessage('読み込んだよ。'))

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
    setMessage(`${name} を保存したよ。`)
  }

  const error = importer.error
  return (
    <div className="flex flex-col gap-2">
      <Group>
        <LinkRow icon={Download} label="書き出す" chevron={false} onClick={exportBackup} />
        <LinkRow
          icon={Upload}
          label="読み込む"
          chevron={false}
          onClick={() => {
            setMessage(null)
            importer.pick()
          }}
        />
      </Group>
      {importer.element}
      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className={`px-4 text-sm leading-6 ${error ? 'font-bold text-danger' : 'text-ink'}`}
        >
          {error ?? message}
        </p>
      )}
      <p className="px-4 text-xs leading-5 text-ink-muted">
        課題・カレンダーの予定・せっていを、1つのファイルにして残せるよ。機種を変えるときや、アプリを入れ直す前に書き出してね。ファイルには課題名も入るので、送る相手に気をつけてね。
      </p>
    </div>
  )
}
