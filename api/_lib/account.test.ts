import { describe, expect, it, vi } from 'vitest'
import { deleteAccount } from './account.js'
import { bearerToken } from './identity.js'
import { fakeSocial } from './socialFake.js'

describe('deleteAccount', () => {
  it('トークンがない・合わなければ 401 で、何も消さない', async () => {
    const { deps, calls } = fakeSocial()
    expect((await deleteAccount(null, deps)).status).toBe(401)
    expect((await deleteAccount('bad', deps)).status).toBe(401)
    expect(calls).toEqual([])
  })

  it('先にこちらのデータを消し、そのあと Clerk のアカウントを消す', async () => {
    const { deps, calls } = fakeSocial()
    expect(await deleteAccount('good', deps)).toEqual({ status: 200, body: { ok: true } })
    expect(calls).toEqual(['db:user_1', 'clerk:user_1'])
  })

  it('DB で失敗したら、Clerk のアカウントは消さない', async () => {
    const { deps, calls } = fakeSocial()
    deps.db.deleteUserData = vi.fn(async () => {
      throw new Error('db down')
    })
    await expect(deleteAccount('good', deps)).rejects.toThrow('db down')
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
