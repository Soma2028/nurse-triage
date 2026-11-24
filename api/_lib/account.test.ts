import { describe, expect, it, vi } from 'vitest'
import { deleteAccount, type SocialDeps } from './account.js'
import { bearerToken } from './identity.js'

function deps(userId: string | null) {
  const calls: string[] = []
  const d: SocialDeps = {
    db: {
      deleteUserData: vi.fn(async (id: string) => {
        calls.push(`db:${id}`)
      }),
    },
    identity: {
      verify: vi.fn(async (token: string) => (token === 'good' ? userId : null)),
      deleteUser: vi.fn(async (id: string) => {
        calls.push(`clerk:${id}`)
      }),
    },
  }
  return { d, calls }
}

describe('deleteAccount', () => {
  it('トークンがない・合わなければ 401 で、何も消さない', async () => {
    const { d, calls } = deps('user_1')
    expect((await deleteAccount(null, d)).status).toBe(401)
    expect((await deleteAccount('bad', d)).status).toBe(401)
    expect(calls).toEqual([])
  })

  it('先にこちらのデータを消し、そのあと Clerk のアカウントを消す', async () => {
    const { d, calls } = deps('user_1')
    expect(await deleteAccount('good', d)).toEqual({ status: 200, body: { ok: true } })
    expect(calls).toEqual(['db:user_1', 'clerk:user_1'])
  })

  it('DB で失敗したら、Clerk のアカウントは消さない', async () => {
    const { d, calls } = deps('user_1')
    d.db.deleteUserData = vi.fn(async () => {
      throw new Error('db down')
    })
    await expect(deleteAccount('good', d)).rejects.toThrow('db down')
    expect(calls).toEqual([])
  })
})

describe('bearerToken', () => {
  it('Bearer のあとのトークンだけを取り出す', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def')
    expect(bearerToken('Bearer ')).toBeNull()
    expect(bearerToken('abc')).toBeNull()
    expect(bearerToken(null)).toBeNull()
  })
})
