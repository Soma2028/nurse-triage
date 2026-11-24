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
}

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
