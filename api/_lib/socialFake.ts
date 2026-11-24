/**
 * テスト用：メモリ上の SocialDb と Identity（本物の SQL・Clerk は動かさない）。
 */
import { vi } from 'vitest'
import type { SocialDeps } from './account.js'
import type { Profile } from './profile.js'
import type { SocialDb } from './socialDb.js'

export function fakeSocial(tokens: Record<string, string> = { good: 'user_1' }) {
  const profiles = new Map<string, Profile>()
  const calls: string[] = []
  const db: SocialDb = {
    getProfile: async (userId) => profiles.get(userId) ?? null,
    saveProfile: async (userId, input, friendCode) => {
      const current = profiles.get(userId)
      if (!current && [...profiles.values()].some((p) => p.friendCode === friendCode)) return null
      const saved = { ...input, friendCode: current?.friendCode ?? friendCode }
      profiles.set(userId, saved)
      return saved
    },
    deleteUserData: vi.fn(async (userId: string) => {
      calls.push(`db:${userId}`)
      profiles.delete(userId)
    }),
  }
  const deps: SocialDeps = {
    db,
    identity: {
      verify: vi.fn(async (token: string) => tokens[token] ?? null),
      deleteUser: vi.fn(async (userId: string) => {
        calls.push(`clerk:${userId}`)
      }),
    },
  }
  return { deps, db, profiles, calls }
}
