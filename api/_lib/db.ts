/**
 * DB（Neon の Postgres）とのやりとり。
 * API の処理は Db インターフェースだけを使うので、テストではモックに差し替えられる。
 */
import { neon } from '@neondatabase/serverless'
import type { NotifyPrefs, Reminder } from './schedule.js'

export interface Device {
  id: string
  secretHash: string
  settings: NotifyPrefs
}

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface Db {
  getDevice(id: string): Promise<Device | null>
  /** 端末を作る。同時に2回来ても先に作られた方を残す（あとで secret を照合する） */
  createDevice(id: string, secretHash: string, settings: NotifyPrefs): Promise<void>
  deleteDevice(id: string): Promise<void>
  /** 宛先を登録する。同じ endpoint があれば、この端末のものとして上書きする */
  upsertSubscription(deviceId: string, target: PushTarget): Promise<void>
  /** この端末の宛先を1つ消し、残りの宛先の数を返す */
  deleteSubscription(deviceId: string, endpoint: string): Promise<number>
  /** push サービスに「もうない」と言われた宛先を消す */
  deleteSubscriptionByEndpoint(endpoint: string): Promise<void>
  listSubscriptions(deviceId: string): Promise<PushTarget[]>
  /** 端末の設定と課題を、1つのトランザクションで丸ごと置き換える */
  replaceReminders(deviceId: string, settings: NotifyPrefs, reminders: Reminder[]): Promise<void>
}

/** 本番の DB。DATABASE_URL は Vercel の環境変数から */
export function neonDb(databaseUrl: string): Db {
  const sql = neon(databaseUrl)

  return {
    async getDevice(id) {
      const rows = await sql`select id, secret_hash, settings from devices where id = ${id}`
      const row = rows[0]
      if (!row) return null
      return { id: row.id, secretHash: row.secret_hash, settings: row.settings }
    },

    async createDevice(id, secretHash, settings) {
      await sql`
        insert into devices (id, secret_hash, settings)
        values (${id}, ${secretHash}, ${JSON.stringify(settings)}::jsonb)
        on conflict (id) do nothing`
    },

    async deleteDevice(id) {
      // subscriptions・reminders・sent は on delete cascade で一緒に消える
      await sql`delete from devices where id = ${id}`
    },

    async upsertSubscription(deviceId, t) {
      await sql`
        insert into subscriptions (endpoint, device_id, p256dh, auth)
        values (${t.endpoint}, ${deviceId}, ${t.p256dh}, ${t.auth})
        on conflict (endpoint) do update
          set device_id = excluded.device_id, p256dh = excluded.p256dh, auth = excluded.auth`
    },

    async deleteSubscription(deviceId, endpoint) {
      const [, rows] = await sql.transaction([
        sql`delete from subscriptions where device_id = ${deviceId} and endpoint = ${endpoint}`,
        sql`select count(*)::int as n from subscriptions where device_id = ${deviceId}`,
      ])
      return rows[0].n as number
    },

    async deleteSubscriptionByEndpoint(endpoint) {
      await sql`delete from subscriptions where endpoint = ${endpoint}`
    },

    async listSubscriptions(deviceId) {
      const rows = await sql`
        select endpoint, p256dh, auth from subscriptions where device_id = ${deviceId}`
      return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }))
    },

    async replaceReminders(deviceId, settings, reminders) {
      // 配列をまとめて渡し、unnest で1回の insert にする
      const ids = reminders.map((r) => r.taskId)
      const types = reminders.map((r) => r.type)
      const titles = reminders.map((r) => r.title)
      const dues = reminders.map((r) => new Date(r.due).toISOString())
      const dones = reminders.map((r) => r.done)
      await sql.transaction([
        sql`update devices set settings = ${JSON.stringify(settings)}::jsonb where id = ${deviceId}`,
        sql`delete from reminders where device_id = ${deviceId}`,
        sql`
          insert into reminders (device_id, task_id, type, title, due, done)
          select ${deviceId}::uuid, * from unnest(
            ${ids}::text[], ${types}::text[], ${titles}::text[],
            ${dues}::timestamptz[], ${dones}::boolean[]
          )`,
      ])
    },
  }
}
