/**
 * ログイン・プロフィール・フレンドの DB（SPEC-social.md）。通知の db.ts とは分けておく。
 * 課題名・課題の中身はここには入れない。
 */
import { neon } from '@neondatabase/serverless'
import type { PushTarget } from './db.js'
import type { Profile, ProfileIcon, ProfileInput } from './profile.js'

export interface SocialDb {
  getProfile(userId: string): Promise<Profile | null>
  /**
   * プロフィールを作る・直す。friendCode は初めて作るときだけ使う（直すときはいまのコードのまま）。
   * そのコードがほかの人と重なったら null（呼ぶ側が別のコードでやり直す）
   */
  saveProfile(userId: string, input: ProfileInput, friendCode: string): Promise<Profile | null>
  /**
   * 退会：その人のデータをまとめて消す。profiles を消すと、フレンド・申請・応援・進み具合も
   * on delete cascade で消える。端末に付けたユーザー ID も外す
   */
  deleteUserData(userId: string): Promise<void>

  // ---- フレンド ----
  /** フレンドコードの持ち主。いなければ null */
  findUserByCode(code: string): Promise<string | null>
  /** その人から見た、フレンド・届いた申請・送った申請・ブロックした人 */
  friendLists(userId: string): Promise<FriendLists>
  /** a から見た b との関係 */
  relation(a: string, b: string): Promise<Relation>
  countFriends(userId: string): Promise<number>
  addRequest(from: string, to: string): Promise<void>
  deleteRequest(from: string, to: string): Promise<void>
  /** フレンドにする（2人の間の申請はどちら向きも消す） */
  makeFriends(a: string, b: string): Promise<void>
  removeFriend(a: string, b: string): Promise<void>
  /** ブロックする（フレンドと、2人の間の申請も消す） */
  block(blocker: string, blocked: string): Promise<void>
  unblock(blocker: string, blocked: string): Promise<void>
  /** フレンドコードを作り直す。ほかの人と重なったら false */
  setFriendCode(userId: string, code: string): Promise<boolean>

  // ---- 今日の進み具合 ----
  saveProgress(userId: string, p: ProgressInput): Promise<void>
  /** 見せるのをやめたら、置いてある進み具合も消す */
  setShareProgress(userId: string, share: boolean): Promise<void>

  // ---- 応援 ----
  /** from から to へ、since 以降に送った応援の数（1日の上限を見るため） */
  countCheers(from: string, to: string, since: number): Promise<number>
  addCheer(from: string, to: string, stamp: Stamp): Promise<void>

  // ---- 端末（応援を通知で届けるため） ----
  /** 通知の端末の secret の SHA-256。端末がなければ null */
  deviceSecretHash(deviceId: string): Promise<string | null>
  /** 端末にユーザー ID を付ける（同じ端末で別の人がログインしたら付け替える） */
  linkDevice(deviceId: string, userId: string): Promise<void>
  /** その人の端末なら、ユーザー ID を外す */
  unlinkDevice(deviceId: string, userId: string): Promise<void>
  /** その人の端末すべての通知の宛先 */
  userSubscriptions(userId: string): Promise<PushTarget[]>
  deleteSubscriptionByEndpoint(endpoint: string): Promise<void>
}

/** 応援のスタンプ */
export const STAMPS = ['ganbare', 'otsukare', 'issho', 'erai'] as const
export type Stamp = (typeof STAMPS)[number]

/** 届いた応援（送った人と、いつ・どのスタンプか） */
export interface Cheer {
  id: number
  from: Person
  stamp: Stamp
  createdAt: number // epoch ms
}

/** 今日の進み具合（課題名・種類・締切は含まない。数だけ） */
export interface ProgressInput {
  day: string // 端末の日付 YYYY-MM-DD
  doneCount: number // その日に完了にした課題の数
  redCount: number // いまの赤の課題の数
}

export interface Progress extends ProgressInput {
  updatedAt: number // epoch ms
}

/** フレンドの一覧などに出す人（課題のことは何も含まない） */
export interface Person {
  userId: string
  nickname: string
  icon: ProfileIcon
  grade: number | null
  bio: string
  photo: string | null // 写真のアイコン（なければ絵のアイコン）
  /** フレンドの一覧でだけ入る。見せない設定・まだ送っていなければ null */
  progress?: Progress | null
}

export interface FriendLists {
  cheers: Cheer[] // 届いた応援（新しい順・最近の分だけ）
  friends: Person[]
  incoming: Person[] // 届いた申請
  outgoing: Person[] // 送った申請
  blocked: Person[] // ブロックした人
}

export interface Relation {
  friends: boolean
  requested: boolean // a → b の申請がある
  requestedBy: boolean // b → a の申請がある
  blocked: boolean // a が b をブロックしている
  blockedBy: boolean // b が a をブロックしている
}

/** friendships は user_a < user_b の1行で1組 */
export const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a])

export function neonSocialDb(databaseUrl: string): SocialDb {
  const sql = neon(databaseUrl)
  return {
    async getProfile(userId) {
      const rows = await sql`
        select nickname, icon, grade, bio, photo, friend_code, share_progress from profiles where user_id = ${userId}`
      return rows[0] ? toProfile(rows[0]) : null
    },

    async saveProfile(userId, p, friendCode) {
      try {
        const rows = await sql`
          insert into profiles (user_id, nickname, icon, grade, bio, photo, friend_code)
          values (${userId}, ${p.nickname}, ${p.icon}, ${p.grade}, ${p.bio}, ${p.photo}, ${friendCode})
          on conflict (user_id) do update
            set nickname = excluded.nickname, icon = excluded.icon,
                grade = excluded.grade, bio = excluded.bio, photo = excluded.photo
          returning nickname, icon, grade, bio, photo, friend_code, share_progress`
        return toProfile(rows[0])
      } catch (e) {
        // フレンドコードがほかの人と重なった
        if ((e as { code?: string }).code === '23505') return null
        throw e
      }
    },

    async findUserByCode(code) {
      const rows = await sql`select user_id from profiles where friend_code = ${code}`
      return (rows[0]?.user_id as string | undefined) ?? null
    },

    async friendLists(userId) {
      const [cheers, friends, incoming, outgoing, blocked] = await sql.transaction(
        [
          // 届いた応援：14日以内の30件。ブロックした人からのものは出さない
          sql`select c.id, c.stamp, c.created_at, p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo
              from cheers c join profiles p on p.user_id = c.from_user
              where c.to_user = ${userId}
                and c.created_at > now() - interval '14 days'
                and not exists (select 1 from blocks b where b.blocker = ${userId} and b.blocked = c.from_user)
              order by c.created_at desc limit 30`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo,
                pr.day::text as day, pr.done_count, pr.red_count, pr.updated_at
              from friendships f
              join profiles p on p.user_id = case when f.user_a = ${userId} then f.user_b else f.user_a end
              left join progress pr on pr.user_id = p.user_id and p.share_progress
              where f.user_a = ${userId} or f.user_b = ${userId}
              order by p.nickname`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo from friend_requests r
              join profiles p on p.user_id = r.from_user
              where r.to_user = ${userId} order by r.created_at desc`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo from friend_requests r
              join profiles p on p.user_id = r.to_user
              where r.from_user = ${userId} order by r.created_at desc`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo from blocks b
              join profiles p on p.user_id = b.blocked
              where b.blocker = ${userId} order by b.created_at desc`,
        ],
        { readOnly: true },
      )
      return {
        cheers: cheers.map((r) => ({
          id: Number(r.id),
          from: toPerson(r),
          stamp: r.stamp as Stamp,
          createdAt: new Date(r.created_at as string | Date).getTime(),
        })),
        friends: friends.map((r) => ({ ...toPerson(r), progress: toProgress(r) })),
        incoming: incoming.map(toPerson),
        outgoing: outgoing.map(toPerson),
        blocked: blocked.map(toPerson),
      }
    },

    async relation(a, b) {
      const [x, y] = pair(a, b)
      const rows = await sql`
        select
          exists (select 1 from friendships where user_a = ${x} and user_b = ${y}) as friends,
          exists (select 1 from friend_requests where from_user = ${a} and to_user = ${b}) as requested,
          exists (select 1 from friend_requests where from_user = ${b} and to_user = ${a}) as requested_by,
          exists (select 1 from blocks where blocker = ${a} and blocked = ${b}) as blocked,
          exists (select 1 from blocks where blocker = ${b} and blocked = ${a}) as blocked_by`
      const r = rows[0]
      return {
        friends: r.friends,
        requested: r.requested,
        requestedBy: r.requested_by,
        blocked: r.blocked,
        blockedBy: r.blocked_by,
      }
    },

    async countFriends(userId) {
      const rows = await sql`
        select count(*)::int as n from friendships where user_a = ${userId} or user_b = ${userId}`
      return rows[0].n as number
    },

    async addRequest(from, to) {
      await sql`
        insert into friend_requests (from_user, to_user) values (${from}, ${to})
        on conflict do nothing`
    },

    async deleteRequest(from, to) {
      await sql`delete from friend_requests where from_user = ${from} and to_user = ${to}`
    },

    async makeFriends(a, b) {
      const [x, y] = pair(a, b)
      await sql.transaction([
        sql`insert into friendships (user_a, user_b) values (${x}, ${y}) on conflict do nothing`,
        sql`delete from friend_requests
            where (from_user = ${a} and to_user = ${b}) or (from_user = ${b} and to_user = ${a})`,
      ])
    },

    async removeFriend(a, b) {
      const [x, y] = pair(a, b)
      await sql`delete from friendships where user_a = ${x} and user_b = ${y}`
    },

    async block(blocker, blocked) {
      const [x, y] = pair(blocker, blocked)
      await sql.transaction([
        sql`insert into blocks (blocker, blocked) values (${blocker}, ${blocked}) on conflict do nothing`,
        sql`delete from friendships where user_a = ${x} and user_b = ${y}`,
        sql`delete from friend_requests
            where (from_user = ${blocker} and to_user = ${blocked})
               or (from_user = ${blocked} and to_user = ${blocker})`,
      ])
    },

    async unblock(blocker, blocked) {
      await sql`delete from blocks where blocker = ${blocker} and blocked = ${blocked}`
    },

    async setFriendCode(userId, code) {
      try {
        await sql`update profiles set friend_code = ${code} where user_id = ${userId}`
        return true
      } catch (e) {
        if ((e as { code?: string }).code === '23505') return false
        throw e
      }
    },

    async saveProgress(userId, p) {
      await sql`
        insert into progress (user_id, day, done_count, red_count, updated_at)
        values (${userId}, ${p.day}::date, ${p.doneCount}, ${p.redCount}, now())
        on conflict (user_id) do update
          set day = excluded.day, done_count = excluded.done_count,
              red_count = excluded.red_count, updated_at = now()`
    },

    async setShareProgress(userId, share) {
      await sql.transaction([
        sql`update profiles set share_progress = ${share} where user_id = ${userId}`,
        ...(share ? [] : [sql`delete from progress where user_id = ${userId}`]),
      ])
    },

    async countCheers(from, to, since) {
      const rows = await sql`
        select count(*)::int as n from cheers
        where from_user = ${from} and to_user = ${to}
          and created_at >= ${new Date(since).toISOString()}::timestamptz`
      return rows[0].n as number
    },

    async addCheer(from, to, stamp) {
      await sql`insert into cheers (from_user, to_user, stamp) values (${from}, ${to}, ${stamp})`
    },

    async deviceSecretHash(deviceId) {
      const rows = await sql`select secret_hash from devices where id = ${deviceId}`
      return (rows[0]?.secret_hash as string | undefined) ?? null
    },

    async linkDevice(deviceId, userId) {
      await sql`update devices set user_id = ${userId} where id = ${deviceId}`
    },

    async unlinkDevice(deviceId, userId) {
      await sql`update devices set user_id = null where id = ${deviceId} and user_id = ${userId}`
    },

    async userSubscriptions(userId) {
      const rows = await sql`
        select s.endpoint, s.p256dh, s.auth from subscriptions s
        join devices d on d.id = s.device_id
        where d.user_id = ${userId}`
      return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }))
    },

    async deleteSubscriptionByEndpoint(endpoint) {
      await sql`delete from subscriptions where endpoint = ${endpoint}`
    },

    async deleteUserData(userId) {
      await sql.transaction([
        sql`delete from profiles where user_id = ${userId}`,
        sql`update devices set user_id = null where user_id = ${userId}`,
      ])
    },
  }
}

function toProfile(row: Record<string, unknown>): Profile {
  return {
    nickname: row.nickname as string,
    icon: row.icon as ProfileIcon,
    grade: row.grade === null ? null : Number(row.grade),
    bio: row.bio as string,
    photo: (row.photo as string | null) ?? null,
    friendCode: row.friend_code as string,
    shareProgress: row.share_progress !== false,
  }
}

function toPerson(row: Record<string, unknown>): Person {
  return {
    userId: row.user_id as string,
    nickname: row.nickname as string,
    icon: row.icon as ProfileIcon,
    grade: row.grade === null ? null : Number(row.grade),
    bio: row.bio as string,
    photo: (row.photo as string | null) ?? null,
  }
}

function toProgress(row: Record<string, unknown>): Progress | null {
  if (row.day === null || row.day === undefined) return null
  return {
    day: String(row.day),
    doneCount: Number(row.done_count),
    redCount: Number(row.red_count),
    updatedAt: new Date(row.updated_at as string | Date).getTime(),
  }
}
