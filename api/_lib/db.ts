/**
 * DB（Neon の Postgres）とのやりとり。
 * API の処理は Db インターフェースだけを使うので、テストではモックに差し替えられる。
 */
import { neon } from '@neondatabase/serverless'
import {
  DEFAULT_PREFS,
  sentKey,
  type NoticeKind,
  type NotifyPrefs,
  type Reminder,
} from './schedule.js'
import { prefsSchema } from './validate.js'

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

/** cron で1端末ぶんに必要なもの */
export interface CronTarget {
  deviceId: string
  prefs: NotifyPrefs
  reminders: Reminder[] // 未完了で、締切がまだ来ていないもの
  subscriptions: PushTarget[]
  sent: Set<string> // sentKey() の形
}

/** sent テーブルの1行を指すもの */
export interface SentRef {
  deviceId: string
  taskId: string
  kind: NoticeKind
  due: number
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

  // ---- cron 用 ----
  /** 宛先のある端末ごとに、通知の判定に必要なものをまとめて読む */
  listCronTargets(now: number): Promise<CronTarget[]>
  /** 送る前に sent に記録する。すでにあれば false（ほかの cron が送った・送っている） */
  claimSent(ref: SentRef): Promise<boolean>
  /** 1件も届けられなかったとき、記録を取り消して次の cron で送り直せるようにする */
  releaseSent(ref: SentRef): Promise<void>
  /** 古い送信記録を消す */
  pruneSent(before: number): Promise<void>
}

/** DB の jsonb の設定を読む。壊れていたら初期値 */
export function toPrefs(v: unknown): NotifyPrefs {
  const parsed = prefsSchema.safeParse(v)
  return parsed.success ? parsed.data : DEFAULT_PREFS
}

const ms = (v: unknown) => new Date(v as string | Date).getTime()

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

    async listCronTargets(now) {
      const nowIso = new Date(now).toISOString()
      // 朝のまとめの送信記録（その朝 7:00）も入るよう、1日前からの記録を読む
      const since = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const [devices, subs, rems, sent] = await sql.transaction(
        [
          sql`select id, settings from devices
              where exists (select 1 from subscriptions s where s.device_id = devices.id)`,
          sql`select device_id, endpoint, p256dh, auth from subscriptions`,
          sql`select device_id, task_id, type, title, due from reminders
              where not done and due > ${nowIso}::timestamptz`,
          sql`select device_id, task_id, kind, due from sent where due > ${since}::timestamptz`,
        ],
        { readOnly: true },
      )
      const targets = new Map<string, CronTarget>()
      for (const d of devices) {
        targets.set(d.id, {
          deviceId: d.id,
          prefs: toPrefs(d.settings),
          reminders: [],
          subscriptions: [],
          sent: new Set(),
        })
      }
      for (const s of subs) {
        targets.get(s.device_id)?.subscriptions.push({
          endpoint: s.endpoint,
          p256dh: s.p256dh,
          auth: s.auth,
        })
      }
      for (const r of rems) {
        targets.get(r.device_id)?.reminders.push({
          taskId: r.task_id,
          type: r.type,
          title: r.title,
          due: ms(r.due),
          done: false,
        })
      }
      for (const x of sent) {
        targets.get(x.device_id)?.sent.add(sentKey(x.task_id, x.kind, ms(x.due)))
      }
      return [...targets.values()]
    },

    async claimSent(ref) {
      const rows = await sql`
        insert into sent (device_id, task_id, kind, due)
        values (${ref.deviceId}, ${ref.taskId}, ${ref.kind}, ${new Date(ref.due).toISOString()}::timestamptz)
        on conflict do nothing
        returning 1 as claimed`
      return rows.length > 0
    },

    async releaseSent(ref) {
      await sql`
        delete from sent
        where device_id = ${ref.deviceId} and task_id = ${ref.taskId} and kind = ${ref.kind}
          and due = ${new Date(ref.due).toISOString()}::timestamptz`
    },

    async pruneSent(before) {
      await sql`delete from sent where sent_at < ${new Date(before).toISOString()}::timestamptz`
    },
  }
}
