import { ClerkProvider } from '@clerk/react'
import type { ReactNode } from 'react'
import { SocialContext } from './SocialContext'

/**
 * Clerk の公開キーが取れたときだけ、アプリ全体をこれで包む。
 * Clerk は大きいので、main.tsx から必要なときだけ読み込む（別のファイルに分ける）
 */
export function SocialRoot({ clerkKey, children }: { clerkKey: string; children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <SocialContext.Provider value={true}>{children}</SocialContext.Provider>
    </ClerkProvider>
  )
}
