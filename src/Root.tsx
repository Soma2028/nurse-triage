import { useState, type ReactNode } from 'react'
import { InvitePage } from './components/InvitePage'
import { takeInviteFromUrl } from './social/invite'

/**
 * 招待の専用ページか、いつものアプリか。
 * inviteCode があれば専用ページを出し、「このブラウザで申請する」を押したらアプリ（招待のシートつき）へ
 */
export function Root({ inviteCode: initial, app }: { inviteCode: string | null; app: ReactNode }) {
  const [inviteCode, setInviteCode] = useState(initial)
  if (inviteCode) {
    return (
      <InvitePage
        code={inviteCode}
        onUseHere={() => {
          takeInviteFromUrl()
          setInviteCode(null)
        }}
      />
    )
  }
  return app
}
