/**
 * ログイン・プロフィール・フレンドの DB（SPEC-social.md）。通知の db.ts とは分けておく。
 * 課題名・課題の中身はここには入れない。
 */
import { neon } from '@neondatabase/serverless'

export interface SocialDb {
  /**
   * 退会：その人のデータをまとめて消す。profiles を消すと、フレンド・申請・応援・進み具合も
   * on delete cascade で消える。端末に付けたユーザー ID も外す
   */
  deleteUserData(userId: string): Promise<void>
}

export function neonSocialDb(databaseUrl: string): SocialDb {
  const sql = neon(databaseUrl)
  return {
    async deleteUserData(userId) {
      await sql.transaction([
        sql`delete from profiles where user_id = ${userId}`,
        sql`update devices set user_id = null where user_id = ${userId}`,
      ])
    },
  }
}
