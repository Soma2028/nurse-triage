/**
 * テスト用：neon() のタグ付きテンプレートと同じ使い方で、PGlite（手元の Postgres）に SQL を送る。
 * sql`...` の中に sql`...` を埋め込む書き方と、sql.transaction([...]) に対応する。
 */
import type { PGlite } from '@electric-sql/pglite'
import type { SqlTag } from './socialDb.js'

const FRAGMENT = Symbol('fragment')

interface Fragment extends PromiseLike<Record<string, unknown>[]> {
  [FRAGMENT]: true
  strings: readonly string[]
  values: unknown[]
}

const isFragment = (v: unknown): v is Fragment =>
  typeof v === 'object' && v !== null && FRAGMENT in v

/** 埋め込みを開いて、$1, $2… の SQL と値にする */
function compile(f: Fragment, params: unknown[]): string {
  let text = ''
  f.strings.forEach((str, i) => {
    text += str
    if (i >= f.values.length) return
    const v = f.values[i]
    if (isFragment(v)) text += compile(v, params)
    else {
      params.push(v)
      text += `$${params.length}`
    }
  })
  return text
}

export function pgliteSql(db: PGlite): SqlTag {
  const exec = async (f: Fragment) => {
    const params: unknown[] = []
    const text = compile(f, params)
    return (await db.query<Record<string, unknown>>(text, params)).rows
  }
  const tag = (strings: TemplateStringsArray, ...values: unknown[]): Fragment => {
    const f: Fragment = {
      [FRAGMENT]: true,
      strings,
      values,
      then: (resolve, reject) => exec(f).then(resolve, reject),
    }
    return f
  }
  tag.transaction = (list: Fragment[]) =>
    db.transaction(async (tx) => {
      const out: Record<string, unknown>[][] = []
      for (const f of list) {
        const params: unknown[] = []
        out.push((await tx.query<Record<string, unknown>>(compile(f, params), params)).rows)
      }
      return out
    })
  return tag as unknown as SqlTag
}
