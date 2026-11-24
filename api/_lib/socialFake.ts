/**
 * テスト用：メモリ上の SocialDb と Identity（本物の SQL・Clerk は動かさない）。
 */
import { vi } from 'vitest'
import type { SocialDeps } from './account.js'
import type { Profile } from './profile.js'
import type { PushTarget } from './db.js'
import { pair, type Cheer, type Person, type Progress, type SocialDb } from './socialDb.js'

export function fakeSocial(tokens: Record<string, string> = { good: 'user_1' }) {
  const profiles = new Map<string, Profile>()
  const requests = new Set<string>() // `${from}>${to}`
  const friendships = new Set<string>() // `${a}|${b}`（a < b）
  const blocks = new Set<string>() // `${blocker}>${blocked}`
  const progress = new Map<string, Progress>()
  const cheers: (Omit<Cheer, 'from'> & { fromId: string; toId: string })[] = []
  /** 応援の時刻に使う時計（テストで進める） */
  const clock = { now: Date.UTC(2026, 10, 24, 3) } // 日本時間 11/24 12:00
  const devices = new Map<string, { secretHash: string; userId: string | null }>()
  const subs = new Map<string, PushTarget & { deviceId: string }>()
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
      const saved = {
        ...input,
        friendCode: current?.friendCode ?? friendCode,
        shareProgress: current?.shareProgress ?? true,
      }
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
      cheers: cheers
        .filter((c) => c.toId === me && !blocks.has(`${me}>${c.fromId}`))
        .sort((x, y) => y.createdAt - x.createdAt)
        .map(({ id, stamp, createdAt, fromId }) => ({
          id,
          stamp,
          createdAt,
          from: person(fromId),
        })),
      friends: [...friendships]
        .map((f) => f.split('|'))
        .filter((f) => f.includes(me))
        .map((f) => (f[0] === me ? f[1] : f[0]))
        .map((id) => ({
          ...person(id),
          progress: profiles.get(id)!.shareProgress ? (progress.get(id) ?? null) : null,
        })),
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
    saveProgress: async (userId, p) => {
      progress.set(userId, { ...p, updatedAt: 1 })
    },
    setShareProgress: async (userId, share) => {
      profiles.set(userId, { ...profiles.get(userId)!, shareProgress: share })
      if (!share) progress.delete(userId)
    },
    countCheers: async (from, to, since) =>
      cheers.filter((c) => c.fromId === from && c.toId === to && c.createdAt >= since).length,
    addCheer: async (from, to, stamp) => {
      cheers.push({ id: cheers.length + 1, fromId: from, toId: to, stamp, createdAt: clock.now })
    },
    deviceSecretHash: async (id) => devices.get(id)?.secretHash ?? null,
    linkDevice: async (id, userId) => {
      devices.get(id)!.userId = userId
    },
    unlinkDevice: async (id, userId) => {
      const d = devices.get(id)
      if (d?.userId === userId) d.userId = null
    },
    userSubscriptions: async (userId) =>
      [...subs.values()]
        .filter((s) => devices.get(s.deviceId)?.userId === userId)
        .map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })),
    deleteSubscriptionByEndpoint: async (endpoint) => {
      subs.delete(endpoint)
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
  return { deps, db, profiles, friendships, progress, cheers, clock, devices, subs, calls }
}
