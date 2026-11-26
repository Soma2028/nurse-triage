import { useState, type ReactNode } from 'react'
import { WelcomePage } from './components/WelcomePage'
import { usePendingInvite } from './social/invite'
import { markWelcomed } from './store/firstRun'

/**
 * 初めて開いたときは、アプリの代わりにはじめの画面（アカウントを作る／ゲストではじめる）を出す。
 * 招待リンクから来たときは、招待のシートがログインまで案内するので出さない
 */
export function FirstRunGate({ firstRun, children }: { firstRun: boolean; children: ReactNode }) {
  const [show, setShow] = useState(firstRun)
  const invite = usePendingInvite()
  if (!show || invite) return children
  return (
    <WelcomePage
      onDone={() => {
        markWelcomed()
        setShow(false)
      }}
    />
  )
}
