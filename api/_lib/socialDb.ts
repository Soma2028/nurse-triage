/**
 * ログイン・プロフィール・フレンドの DB（SPEC-social.md）。通知の db.ts とは分けておく。
 * 課題名・課題の中身はここには入れない。
 */
import { neon } from '@neondatabase/serverless'
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
}

/** フレンドの一覧などに出す人（課題のことは何も含まない） */
export interface Person {
  userId: string
  nickname: string
  icon: ProfileIcon
  grade: number | null
  bio: string
}

export interface FriendLists {
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
        select nickname, icon, grade, bio, friend_code from profiles where user_id = ${userId}`
      return rows[0] ? toProfile(rows[0]) : null
    },

    async saveProfile(userId, p, friendCode) {
      try {
        const rows = await sql`
          insert into profiles (user_id, nickname, icon, grade, bio, friend_code)
          values (${userId}, ${p.nickname}, ${p.icon}, ${p.grade}, ${p.bio}, ${friendCode})
          on conflict (user_id) do update
            set nickname = excluded.nickname, icon = excluded.icon,
                grade = excluded.grade, bio = excluded.bio
          returning nickname, icon, grade, bio, friend_code`
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
      const [friends, incoming, outgoing, blocked] = await sql.transaction(
        [
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio from friendships f
              join profiles p on p.user_id = case when f.user_a = ${userId} then f.user_b else f.user_a end
              where f.user_a = ${userId} or f.user_b = ${userId}
              order by p.nickname`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio from friend_requests r
              join profiles p on p.user_id = r.from_user
              where r.to_user = ${userId} order by r.created_at desc`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio from friend_requests r
              join profiles p on p.user_id = r.to_user
              where r.from_user = ${userId} order by r.created_at desc`,
          sql`select p.user_id, p.nickname, p.icon, p.grade, p.bio from blocks b
              join profiles p on p.user_id = b.blocked
              where b.blocker = ${userId} order by b.created_at desc`,
        ],
        { readOnly: true },
      )
      return {
        friends: friends.map(toPerson),
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
    friendCode: row.friend_code as string,
  }
}

function toPerson(row: Record<string, unknown>): Person {
  return {
    userId: row.user_id as string,
    nickname: row.nickname as string,
    icon: row.icon as ProfileIcon,
    grade: row.grade === null ? null : Number(row.grade),
    bio: row.bio as string,
  }
}
