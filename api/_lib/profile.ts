/**
 * プロフィール（SPEC-social.md の 3）：入力の形・フレンドコード・/api/profile の中身。
 */
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { UNAUTHORIZED, type SocialDeps } from './account.js'
import type { Result } from './handlers.js'
import { RATE_LIMITED, allowed } from './rateLimit.js'

/** 選べるアイコン。src/social/profile.ts の PROFILE_ICONS と同じ */
export const PROFILE_ICONS = [
  'cat',
  'dog',
  'rabbit',
  'bird',
  'fish',
  'turtle',
  'squirrel',
  'flower',
  'leaf',
  'clover',
  'sun',
  'star',
] as const

export type ProfileIcon = (typeof PROFILE_ICONS)[number]

export interface Profile {
  nickname: string
  icon: ProfileIcon
  grade: number | null // 1〜4。null は「ひみつ」
  bio: string
  friendCode: string
  shareProgress: boolean // 今日の進み具合をフレンドに見せるか
}

export type ProfileInput = Omit<Profile, 'friendCode' | 'shareProgress'>

/** 文字数は見た目の1文字ずつで数える（絵文字・合字も1文字） */
const length = (s: string) => [...s].length
/** 改行・タブなどの見えない文字は入れさせない（見えない文字そのものを探すので、lint の注意は外す） */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/

const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => !CONTROL.test(s), '使えない文字が入っている')
    .refine((s) => length(s) >= min && length(s) <= max, `${min}〜${max}文字`)

export const profileSchema = z.strictObject({
  nickname: text(1, 12),
  icon: z.enum(PROFILE_ICONS),
  grade: z.number().int().min(1).max(4).nullable(),
  bio: text(0, 40),
})

/** フレンドコードに使う文字。0/O・1/I/L のような見分けにくい文字は使わない */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const FRIEND_CODE_LENGTH = 8

export function newFriendCode(): string {
  return Array.from(
    { length: FRIEND_CODE_LENGTH },
    () => CODE_CHARS[randomInt(CODE_CHARS.length)],
  ).join('')
}

/** コードがほかの人と重なったときに作り直す回数 */
const CODE_RETRIES = 5

/** GET /api/profile：自分のプロフィール。まだ作っていなければ null */
export async function getProfile(
  token: string | null,
  { db, identity }: SocialDeps,
): Promise<Result> {
  const userId = token ? await identity.verify(token) : null
  if (!userId) return UNAUTHORIZED
  return { status: 200, body: { profile: await db.getProfile(userId) } }
}

/** PUT /api/profile：作る・直す。初めて作るときにフレンドコードも作る */
export async function putProfile(
  token: string | null,
  input: unknown,
  { db, identity, limiter }: SocialDeps,
): Promise<Result> {
  const userId = token ? await identity.verify(token) : null
  if (!userId) return UNAUTHORIZED
  if (!(await allowed(limiter, 'profile', userId))) return RATE_LIMITED
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: 'invalid input',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    }
  }
  for (let i = 0; i < CODE_RETRIES; i++) {
    const saved = await db.saveProfile(userId, parsed.data, newFriendCode())
    if (saved) return { status: 200, body: { profile: saved } }
  }
  throw new Error('フレンドコードを作れなかった')
}
