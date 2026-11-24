/**
 * フレンド（SPEC-social.md の 4）：/api/friends の中身。
 * どの方法でも「申請 → コードの持ち主が承認 → フレンド」。ブロックされている相手には、
 * 「見つからない」と同じ返事をする（ブロックされたことが相手にわからないように）。
 */
import { z } from 'zod'
import { UNAUTHORIZED, type SocialDeps } from './account.js'
import type { Result } from './handlers.js'
import { FRIEND_CODE_LENGTH, newFriendCode } from './profile.js'
import type { SocialDb } from './socialDb.js'

/** フレンドの上限（1人あたり） */
export const MAX_FRIENDS = 100

const userId = z.string().min(1).max(100)

/** 入れたコードは、空白・ハイフンを取って大文字にしてから比べる */
const code = z
  .string()
  .max(32)
  .transform((s) => s.replace(/[\s-]/g, '').toUpperCase())
  .refine((s) => s.length === FRIEND_CODE_LENGTH, 'コードは8文字')

export const friendActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('request'), code }),
  z.strictObject({ action: z.literal('accept'), userId }),
  z.strictObject({ action: z.literal('decline'), userId }),
  z.strictObject({ action: z.literal('cancel'), userId }),
  z.strictObject({ action: z.literal('remove'), userId }),
  z.strictObject({ action: z.literal('block'), userId }),
  z.strictObject({ action: z.literal('unblock'), userId }),
  z.strictObject({ action: z.literal('regenerateCode') }),
])

const fail = (status: number, error: string): Result => ({ status, body: { error } })

const CODE_RETRIES = 5

/** アプリに返す、いまのフレンドまわりのすべて */
async function snapshot(db: SocialDb, me: string, friendCode: string) {
  return { friendCode, ...(await db.friendLists(me)) }
}

/** GET /api/friends */
export async function getFriends(
  token: string | null,
  { db, identity }: SocialDeps,
): Promise<Result> {
  const me = token ? await identity.verify(token) : null
  if (!me) return UNAUTHORIZED
  const profile = await db.getProfile(me)
  if (!profile) return fail(409, 'no_profile')
  return { status: 200, body: await snapshot(db, me, profile.friendCode) }
}

/** POST /api/friends：申請・承認・断る・取り消す・フレンドをやめる・ブロック・ブロックを外す・コードを作り直す */
export async function postFriends(
  token: string | null,
  input: unknown,
  { db, identity }: SocialDeps,
): Promise<Result> {
  const me = token ? await identity.verify(token) : null
  if (!me) return UNAUTHORIZED
  const parsed = friendActionSchema.safeParse(input)
  if (!parsed.success) return fail(400, 'invalid input')
  const profile = await db.getProfile(me)
  if (!profile) return fail(409, 'no_profile')
  let friendCode = profile.friendCode
  const done = async (result: string) => ({
    status: 200,
    body: { result, ...(await snapshot(db, me, friendCode)) },
  })

  const a = parsed.data
  switch (a.action) {
    case 'request': {
      const other = await db.findUserByCode(a.code)
      if (other === me) return fail(400, 'self')
      if (!other) return fail(404, 'not_found')
      const rel = await db.relation(me, other)
      // ブロックされていたら、見つからないのと同じ返事にする
      if (rel.blockedBy) return fail(404, 'not_found')
      if (rel.blocked) return fail(409, 'blocked')
      if (rel.friends) return fail(409, 'already_friends')
      if (rel.requestedBy) {
        // 相手からもう申請が来ていれば、そのままフレンドになる
        if (!(await underLimit(db, me, other))) return fail(409, 'limit')
        await db.makeFriends(me, other)
        return done('friends')
      }
      if ((await db.countFriends(me)) >= MAX_FRIENDS) return fail(409, 'limit')
      await db.addRequest(me, other)
      return done('requested')
    }
    case 'accept': {
      const rel = await db.relation(me, a.userId)
      if (rel.friends) return done('friends')
      if (!rel.requestedBy || rel.blocked || rel.blockedBy) return fail(404, 'not_found')
      if (!(await underLimit(db, me, a.userId))) return fail(409, 'limit')
      await db.makeFriends(me, a.userId)
      return done('friends')
    }
    case 'decline':
      await db.deleteRequest(a.userId, me)
      return done('declined')
    case 'cancel':
      await db.deleteRequest(me, a.userId)
      return done('canceled')
    case 'remove':
      await db.removeFriend(me, a.userId)
      return done('removed')
    case 'block': {
      if (a.userId === me) return fail(400, 'self')
      if (!(await db.getProfile(a.userId))) return fail(404, 'not_found')
      await db.block(me, a.userId)
      return done('blocked')
    }
    case 'unblock':
      await db.unblock(me, a.userId)
      return done('unblocked')
    case 'regenerateCode': {
      for (let i = 0; i < CODE_RETRIES; i++) {
        const next = newFriendCode()
        if (await db.setFriendCode(me, next)) {
          friendCode = next
          return done('regenerated')
        }
      }
      throw new Error('フレンドコードを作れなかった')
    }
  }
}

/** 2人とも、フレンドの上限に達していないか */
async function underLimit(db: SocialDb, a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([db.countFriends(a), db.countFriends(b)])
  return x < MAX_FRIENDS && y < MAX_FRIENDS
}
