/**
 * ログインした人の確認（Clerk）。API の処理は Identity インターフェースだけを使うので、テストではモックにできる。
 */
import { createClerkClient, verifyToken } from '@clerk/backend'

export interface Identity {
  /** セッショントークンを確かめ、ユーザー ID を返す。だめなら null */
  verify(token: string): Promise<string | null>
  /** Clerk のアカウントを消す。もうなければ何もしない */
  deleteUser(userId: string): Promise<void>
}

/** トークンを受け付けるアプリの場所（本番・この版のプレビュー・手元） */
function authorizedParties(env: Record<string, string | undefined>): string[] {
  const parties = [
    'https://nurse-triage-amber.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ]
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
    if (host) parties.push(`https://${host}`)
  }
  return parties
}

/** Authorization: Bearer <token> からトークンを取り出す */
export function bearerToken(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export function clerkIdentity(
  secretKey: string,
  env: Record<string, string | undefined> = process.env,
): Identity {
  const client = createClerkClient({ secretKey })
  const parties = authorizedParties(env)
  return {
    async verify(token) {
      try {
        const payload = await verifyToken(token, { secretKey, authorizedParties: parties })
        return typeof payload.sub === 'string' ? payload.sub : null
      } catch {
        return null
      }
    },
    async deleteUser(userId) {
      try {
        await client.users.deleteUser(userId)
      } catch (e) {
        // すでに消えているときは成功とみなす
        if ((e as { status?: number }).status === 404) return
        throw e
      }
    },
  }
}
