/**
 * テスト用：メモリ上の SocialDb と Identity（本物の SQL・Clerk は動かさない）。
 */
import { vi } from 'vitest'
import type { SocialDeps } from './account.js'
import type { Profile } from './profile.js'
import { pair, type Person, type SocialDb } from './socialDb.js'

export function fakeSocial(tokens: Record<string, string> = { good: 'user_1' }) {
  const profiles = new Map<string, Profile>()
  const requests = new Set<string>() // `${from}>${to}`
  const friendships = new Set<string>() // `${a}|${b}`（a < b）
  const blocks = new Set<string>() // `${blocker}>${blocked}`
  const calls: string[] = []

  const person = (userId: string): Person => {
    const { nickname, icon, grade, bio } = profiles.get(userId)!
    return { userId, nickname, icon, grade, bio }
  }
  const key = (a: string, b: string) => pair(a, b).join('|')
  const dropRequests = (a: string, b: string) => {
    requests.delete(`${a}>${b}`)
    requests.delete(`${b}>${a}`)
  }

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
    findUserByCode: async (code) =>
      [...profiles].find(([, p]) => p.friendCode === code)?.[0] ?? null,
    friendLists: async (me) => ({
      friends: [...friendships]
        .map((f) => f.split('|'))
        .filter((f) => f.includes(me))
        .map((f) => person(f[0] === me ? f[1] : f[0])),
      incoming: [...requests]
        .map((r) => r.split('>'))
        .filter(([, to]) => to === me)
        .map(([from]) => person(from)),
      outgoing: [...requests]
        .map((r) => r.split('>'))
        .filter(([from]) => from === me)
        .map(([, to]) => person(to)),
      blocked: [...blocks]
        .map((b) => b.split('>'))
        .filter(([blocker]) => blocker === me)
        .map(([, blocked]) => person(blocked)),
    }),
    relation: async (a, b) => ({
      friends: friendships.has(key(a, b)),
      requested: requests.has(`${a}>${b}`),
      requestedBy: requests.has(`${b}>${a}`),
      blocked: blocks.has(`${a}>${b}`),
      blockedBy: blocks.has(`${b}>${a}`),
    }),
    countFriends: async (u) => [...friendships].filter((f) => f.split('|').includes(u)).length,
    addRequest: async (from, to) => {
      requests.add(`${from}>${to}`)
    },
    deleteRequest: async (from, to) => {
      requests.delete(`${from}>${to}`)
    },
    makeFriends: async (a, b) => {
      friendships.add(key(a, b))
      dropRequests(a, b)
    },
    removeFriend: async (a, b) => {
      friendships.delete(key(a, b))
    },
    block: async (blocker, blocked) => {
      blocks.add(`${blocker}>${blocked}`)
      friendships.delete(key(blocker, blocked))
      dropRequests(blocker, blocked)
    },
    unblock: async (blocker, blocked) => {
      blocks.delete(`${blocker}>${blocked}`)
    },
    setFriendCode: async (userId, code) => {
      if ([...profiles].some(([id, p]) => id !== userId && p.friendCode === code)) return false
      profiles.set(userId, { ...profiles.get(userId)!, friendCode: code })
      return true
    },
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
  return { deps, db, profiles, friendships, calls }
}
