/**
 * ログイン・プロフィール・フレンドの DB（SPEC-social.md）。通知の db.ts とは分けておく。
 * 課題名・課題の中身はここには入れない。
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
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

/** まだ作られていないテーブルや列を使う操作をしたとき（503 にする） */
export class NotReadyError extends Error {
  readonly what: string
  constructor(what: string) {
    super(`${what} がまだない（migrations の SQL を実行する）`)
    this.what = what
  }
}

/** neon() の返す、タグ付きテンプレートで SQL を送る関数（テストでは PGlite に差し替える） */
export type SqlTag = NeonQueryFunction<false, false>

/** あとから足したテーブル・列があるか。ないものは、ないものとして読む（読み込みを止めない） */
interface Schema {
  photo: boolean // profiles.photo（005）
  shareProgress: boolean // profiles.share_progress（002）
  progress: boolean // progress（002）
  cheers: boolean // cheers（002）
  blocks: boolean // blocks（003）
  deviceUser: boolean // devices.user_id（002）
}

/** テーブルの有る無しを調べ直す間隔 */
const SCHEMA_TTL_MS = 5 * 60 * 1000

/** テーブルや列がないときのエラー（SQLSTATE） */
const MISSING = new Set(['42P01', '42703'])

export function neonSocialDb(databaseUrl: string): SocialDb {
  return sqlSocialDb(neon(databaseUrl))
}

export function sqlSocialDb(sql: SqlTag): SocialDb {
  let cache: { at: number; value: Promise<Schema> } | null = null

  const probe = async (): Promise<Schema> => {
    const rows = await sql`
      select
        exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles' and column_name = 'photo') as photo,
        exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles' and column_name = 'share_progress') as share_progress,
        exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'devices' and column_name = 'user_id') as device_user,
        to_regclass('public.progress') is not null as progress,
        to_regclass('public.cheers') is not null as cheers,
        to_regclass('public.blocks') is not null as blocks`
    const r = rows[0]
    return {
      photo: r.photo,
      shareProgress: r.share_progress,
      progress: r.progress,
      cheers: r.cheers,
      blocks: r.blocks,
      deviceUser: r.device_user,
    }
  }

  /** いまのテーブルの有る無し（5分ごとに調べ直す。調べられなければ次にまた調べる） */
  const schema = (): Promise<Schema> => {
    if (!cache || Date.now() - cache.at > SCHEMA_TTL_MS) {
      const value = probe().catch((e) => {
        cache = null
        throw e
      })
      cache = { at: Date.now(), value }
    }
    return cache.value
  }

  /** テーブルや列がないエラーが出たら、次は調べ直す（覚えている有る無しが古いかもしれない） */
  const run = async <T>(f: (s: Schema) => Promise<T>): Promise<T> => {
    try {
      return await f(await schema())
    } catch (e) {
      // テーブルや列がない・まだないと断った：SQL を実行したあとすぐ使えるよう、次は調べ直す
      if (e instanceof NotReadyError || MISSING.has((e as { code?: string }).code ?? '')) {
        cache = null
      }
      throw e
    }
  }

  /** フレンドの一覧などに出す人の列（写真の列がなければ null） */
  const personCols = (s: Schema) =>
    s.photo
      ? sql`p.user_id, p.nickname, p.icon, p.grade, p.bio, p.photo`
      : sql`p.user_id, p.nickname, p.icon, p.grade, p.bio, null::text as photo`

  const profileCols = (s: Schema) =>
    sql`nickname, icon, grade, bio, ${s.photo ? sql`photo` : sql`null::text as photo`},
        friend_code, ${s.shareProgress ? sql`share_progress` : sql`true as share_progress`}`

  return {
    getProfile: (userId) =>
      run(async (s) => {
        const rows = await sql`select ${profileCols(s)} from profiles where user_id = ${userId}`
        return rows[0] ? toProfile(rows[0]) : null
      }),

    saveProfile: (userId, p, friendCode) =>
      run(async (s) => {
        try {
          // 写真の列がまだなければ、写真だけ置かない（ほかは保存する）
          const rows = s.photo
            ? await sql`
                insert into profiles (user_id, nickname, icon, grade, bio, photo, friend_code)
                values (${userId}, ${p.nickname}, ${p.icon}, ${p.grade}, ${p.bio}, ${p.photo}, ${friendCode})
                on conflict (user_id) do update
                  set nickname = excluded.nickname, icon = excluded.icon,
                      grade = excluded.grade, bio = excluded.bio, photo = excluded.photo
                returning ${profileCols(s)}`
            : await sql`
                insert into profiles (user_id, nickname, icon, grade, bio, friend_code)
                values (${userId}, ${p.nickname}, ${p.icon}, ${p.grade}, ${p.bio}, ${friendCode})
                on conflict (user_id) do update
                  set nickname = excluded.nickname, icon = excluded.icon,
                      grade = excluded.grade, bio = excluded.bio
                returning ${profileCols(s)}`
          return toProfile(rows[0])
        } catch (e) {
          // フレンドコードがほかの人と重なった
          if ((e as { code?: string }).code === '23505') return null
          throw e
        }
      }),

    async findUserByCode(code) {
      const rows = await sql`select user_id from profiles where friend_code = ${code}`
      return (rows[0]?.user_id as string | undefined) ?? null
    },

    friendLists: (userId) =>
      run(async (s) => {
        const cols = personCols(s)
        const withProgress = s.progress && s.shareProgress
        const [cheers, friends, incoming, outgoing, blocked] = await Promise.all([
          // 届いた応援：14日以内の30件。ブロックした人からのものは出さない
          s.cheers
            ? sql`select c.id, c.stamp, c.created_at, ${cols}
                  from cheers c join profiles p on p.user_id = c.from_user
                  where c.to_user = ${userId}
                    and c.created_at > now() - interval '14 days'
                    ${
                      s.blocks
                        ? sql`and not exists (select 1 from blocks b
                                              where b.blocker = ${userId} and b.blocked = c.from_user)`
                        : sql``
                    }
                  order by c.created_at desc limit 30`
            : Promise.resolve([]),
          withProgress
            ? sql`select ${cols}, pr.day::text as day, pr.done_count, pr.red_count, pr.updated_at
                  from friendships f
                  join profiles p on p.user_id = case when f.user_a = ${userId} then f.user_b else f.user_a end
                  left join progress pr on pr.user_id = p.user_id and p.share_progress
                  where f.user_a = ${userId} or f.user_b = ${userId}
                  order by p.nickname`
            : sql`select ${cols}, null::text as day
                  from friendships f
                  join profiles p on p.user_id = case when f.user_a = ${userId} then f.user_b else f.user_a end
                  where f.user_a = ${userId} or f.user_b = ${userId}
                  order by p.nickname`,
          sql`select ${cols} from friend_requests r join profiles p on p.user_id = r.from_user
              where r.to_user = ${userId} order by r.created_at desc`,
          sql`select ${cols} from friend_requests r join profiles p on p.user_id = r.to_user
              where r.from_user = ${userId} order by r.created_at desc`,
          s.blocks
            ? sql`select ${cols} from blocks b join profiles p on p.user_id = b.blocked
                  where b.blocker = ${userId} order by b.created_at desc`
            : Promise.resolve([]),
        ])
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
      }),

    relation: (a, b) =>
      run(async (s) => {
        const [x, y] = pair(a, b)
        const rows = await sql`
          select
            exists (select 1 from friendships where user_a = ${x} and user_b = ${y}) as friends,
            exists (select 1 from friend_requests where from_user = ${a} and to_user = ${b}) as requested,
            exists (select 1 from friend_requests where from_user = ${b} and to_user = ${a}) as requested_by,
            ${
              s.blocks
                ? sql`exists (select 1 from blocks where blocker = ${a} and blocked = ${b}) as blocked,
                      exists (select 1 from blocks where blocker = ${b} and blocked = ${a}) as blocked_by`
                : sql`false as blocked, false as blocked_by`
            }`
        const r = rows[0]
        return {
          friends: r.friends,
          requested: r.requested,
          requestedBy: r.requested_by,
          blocked: r.blocked,
          blockedBy: r.blocked_by,
        }
      }),

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

    block: (blocker, blocked) =>
      run(async (s) => {
        if (!s.blocks) throw new NotReadyError('blocks')
        const [x, y] = pair(blocker, blocked)
        await sql.transaction([
          sql`insert into blocks (blocker, blocked) values (${blocker}, ${blocked}) on conflict do nothing`,
          sql`delete from friendships where user_a = ${x} and user_b = ${y}`,
          sql`delete from friend_requests
              where (from_user = ${blocker} and to_user = ${blocked})
                 or (from_user = ${blocked} and to_user = ${blocker})`,
        ])
      }),

    unblock: (blocker, blocked) =>
      run(async (s) => {
        if (!s.blocks) return // ブロックのテーブルがなければ、外すものもない
        await sql`delete from blocks where blocker = ${blocker} and blocked = ${blocked}`
      }),

    async setFriendCode(userId, code) {
      try {
        await sql`update profiles set friend_code = ${code} where user_id = ${userId}`
        return true
      } catch (e) {
        if ((e as { code?: string }).code === '23505') return false
        throw e
      }
    },

    saveProgress: (userId, p) =>
      run(async (s) => {
        if (!s.progress) throw new NotReadyError('progress')
        await sql`
          insert into progress (user_id, day, done_count, red_count, updated_at)
          values (${userId}, ${p.day}::date, ${p.doneCount}, ${p.redCount}, now())
          on conflict (user_id) do update
            set day = excluded.day, done_count = excluded.done_count,
                red_count = excluded.red_count, updated_at = now()`
      }),

    setShareProgress: (userId, share) =>
      run(async (s) => {
        if (!s.shareProgress || !s.progress) throw new NotReadyError('progress')
        await sql.transaction([
          sql`update profiles set share_progress = ${share} where user_id = ${userId}`,
          ...(share ? [] : [sql`delete from progress where user_id = ${userId}`]),
        ])
      }),

    countCheers: (from, to, since) =>
      run(async (s) => {
        if (!s.cheers) throw new NotReadyError('cheers')
        const rows = await sql`
          select count(*)::int as n from cheers
          where from_user = ${from} and to_user = ${to}
            and created_at >= ${new Date(since).toISOString()}::timestamptz`
        return rows[0].n as number
      }),

    addCheer: (from, to, stamp) =>
      run(async (s) => {
        if (!s.cheers) throw new NotReadyError('cheers')
        await sql`insert into cheers (from_user, to_user, stamp) values (${from}, ${to}, ${stamp})`
      }),

    async deviceSecretHash(deviceId) {
      const rows = await sql`select secret_hash from devices where id = ${deviceId}`
      return (rows[0]?.secret_hash as string | undefined) ?? null
    },

    linkDevice: (deviceId, userId) =>
      run(async (s) => {
        if (!s.deviceUser) throw new NotReadyError('devices.user_id')
        await sql`update devices set user_id = ${userId} where id = ${deviceId}`
      }),

    unlinkDevice: (deviceId, userId) =>
      run(async (s) => {
        if (!s.deviceUser) return
        await sql`update devices set user_id = null where id = ${deviceId} and user_id = ${userId}`
      }),

    userSubscriptions: (userId) =>
      run(async (s) => {
        if (!s.deviceUser) return [] // 端末にユーザーを付けられなければ、通知は届けない
        const rows = await sql`
          select s.endpoint, s.p256dh, s.auth from subscriptions s
          join devices d on d.id = s.device_id
          where d.user_id = ${userId}`
        return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }))
      }),

    async deleteSubscriptionByEndpoint(endpoint) {
      await sql`delete from subscriptions where endpoint = ${endpoint}`
    },

    deleteUserData: (userId) =>
      run(async (s) => {
        // profiles を消すと、フレンド・申請・応援・進み具合・ブロックも on delete cascade で消える
        await sql.transaction([
          sql`delete from profiles where user_id = ${userId}`,
          ...(s.deviceUser
            ? [sql`update devices set user_id = null where user_id = ${userId}`]
            : []),
        ])
      }),
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
