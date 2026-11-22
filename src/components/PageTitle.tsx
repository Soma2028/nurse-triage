import type { ReactNode } from 'react'

/** 画面の見出し（左寄せ）と、右側に置く小さな操作 */
export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h1 className="ui-page-title">{children}</h1>
      {aside}
    </div>
  )
}
