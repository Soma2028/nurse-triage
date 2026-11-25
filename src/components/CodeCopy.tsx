import { Copy } from 'lucide-react'
import { useState } from 'react'
import { Group } from './Group'

/** フレンドのコードを大きく出し、右にコピーのボタン（招待のページ・シートで共通） */
export function CodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // コピーできなくても、コードは見えている（長押しで選べる）
    }
  }
  return (
    <Group>
      <div className="flex min-h-14 items-center gap-2 pr-2 pl-4">
        <span className="min-w-0 flex-1 text-title font-bold tracking-widest text-ink tabular-nums select-text">
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary"
        >
          <Copy aria-hidden className="size-4" />
          {copied ? 'コピーしたよ' : 'コピー'}
        </button>
      </div>
    </Group>
  )
}
