/**
 * 通知のルール（いつ・どの課題に・どんな文面で送るか）。DB にも時刻にも触らない純粋関数だけ。
 *
 * Vercel のサーバーは UTC で動くので、Date のローカル時刻のメソッド（getHours など）は使わない。
 * 日本は夏時間がないため、固定の +9 時間で日本時間に直して計算する。
 */
import type { TaskType } from '../../src/types.js'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const JST_OFFSET_MS = 9 * HOUR_MS

/** cron は15分おき。予定時刻から60分以内なら送る（取りこぼし防止） */
export const SEND_WINDOW_MS = 60 * MINUTE_MS

export type NoticeKind = 'eve' | 'h3' | 'morning'

/** サーバーに置く課題（reminders の1行）。title は「課題名を通知に出す」が ON のときだけ入る */
export interface Reminder {
  taskId: string
  type: TaskType
  title: string | null
  due: number // epoch ms
  done: boolean
}

/**
 * 端末ごとの通知の設定。時刻は 0:00 からの分（15分刻み。cron が15分おきのため）。
 * 「直前」の通知は、はじめ3時間前で固定だったので、名前が h3 のまま（sent テーブルの kind も h3）。
 */
export interface NotifyPrefs {
  eve: boolean // 締切の前の日
  eveTime: number // 前の日の何時に送るか
  h3: boolean // 締切の直前
  h3Lead: number // 締切の何分前に送るか（H3_LEADS のどれか）
  morning: boolean // 毎日のまとめ
  morningTime: number // 何時に送るか
  showTitle: boolean // 通知に課題名を出す
}

/** 時刻の刻み（分） */
export const TIME_STEP = 15
/** 直前の通知で選べる「締切の何分前」。src/sync/pushState.ts と同じ */
export const H3_LEADS = [30, 60, 120, 180, 240, 360, 720] as const

export const DEFAULT_PREFS: NotifyPrefs = {
  eve: true,
  eveTime: 20 * 60,
  h3: true,
  h3Lead: 180,
  morning: true,
  morningTime: 7 * 60,
  showTitle: false, // 課題名に患者さんの情報が入りやすいので、初期は出さない
}

/** 送る通知1件。taskId・kind・due は sent テーブルのキーになる */
export interface Notice {
  kind: NoticeKind
  taskId: string // まとめは MORNING_TASK_ID
  due: number // 課題の締切。まとめはその日の 0:00（時刻を変えても1日1回にするため）
  title: string
  body: string
  tag: string // 同じ tag の通知は端末で上書きされる
}

/** まとめを sent に記録するときの task_id */
export const MORNING_TASK_ID = 'morning'

/** 通知に出す種類の名前（アプリの表示名より短くする） */
export const NOTICE_TYPE_LABEL = {
  rec: '実習記録',
  proc: '看護過程',
  pre: '実習前の事前学習',
  osce: '技術試験の練習',
  exam: '定期試験・小テスト',
  report: 'レポート',
  gw: 'グループワーク',
  kokushi: '国試対策',
  etc: 'その他の課題',
} satisfies Record<TaskType, string>

/** まとめで、締切が遠くても赤とみなす種類（サーバーでの簡易判定） */
const MORNING_RED_TYPES: readonly TaskType[] = ['rec', 'proc']

// ---- 日本時間の計算 ----

interface JstParts {
  year: number
  month: number // 0〜11
  date: number
  hour: number
  minute: number
}

/** epoch ms → 日本時間の年月日・時分 */
export function toJst(ms: number): JstParts {
  const d = new Date(ms + JST_OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

/** 日本時間の年月日・時分 → epoch ms。date が 0 や月末+1 でも前後の月に繰り上がる */
export function fromJst(year: number, month: number, date: number, hour = 0, minute = 0): number {
  return Date.UTC(year, month, date, hour, minute) - JST_OFFSET_MS
}

/** 「8:30」の形（日本時間） */
export function formatJstTime(ms: number): string {
  const { hour, minute } = toJst(ms)
  return `${hour}:${String(minute).padStart(2, '0')}`
}

/** 「30分」「3時間」 */
export function formatLead(minutes: number): string {
  return minutes < 60 ? `${minutes}分` : `${minutes / 60}時間`
}

// ---- 予定時刻 ----

/** 日本時間のその日の 0:00 */
export function jstDayStart(ms: number): number {
  const { year, month, date } = toJst(ms)
  return fromJst(year, month, date)
}

/** 締切の前の日の time（0:00 からの分、日本時間） */
export function eveAt(due: number, time = DEFAULT_PREFS.eveTime): number {
  const { year, month, date } = toJst(due)
  return fromJst(year, month, date - 1, 0, time)
}

/** 締切の lead 分前 */
export function h3At(due: number, lead = DEFAULT_PREFS.h3Lead): number {
  return due - lead * MINUTE_MS
}

/** now と同じ日（日本時間）の time */
export function morningAt(now: number, time = DEFAULT_PREFS.morningTime): number {
  return jstDayStart(now) + time * MINUTE_MS
}

/**
 * いま送りどきのまとめの予定時刻。なければ null。
 * 23:30 のように夜おそい時刻だと、送りどきが日付をまたぐので、前の日の分も見る。
 */
export function morningDueAt(now: number, time = DEFAULT_PREFS.morningTime): number | null {
  for (const at of [morningAt(now, time), morningAt(now - DAY_MS, time)]) {
    if (isInWindow(at, now)) return at
  }
  return null
}

/** 予定時刻 ≤ 現在 < 予定時刻 + 60分 なら送りどき */
export function isInWindow(at: number, now: number): boolean {
  return at <= now && now < at + SEND_WINDOW_MS
}

/** sent テーブルの主キー（device_id を除く）と同じ組み合わせの文字列 */
export function sentKey(taskId: string, kind: NoticeKind, due: number): string {
  return `${taskId}|${kind}|${due}`
}

// ---- 文面 ----

/** 通知に出す名前。課題名を出さない設定・課題名がないときは種類名 */
export function noticeName(r: Reminder, prefs: NotifyPrefs): string {
  const title = r.title?.trim()
  return prefs.showTitle && title ? title : NOTICE_TYPE_LABEL[r.type]
}

/** まとめで「赤」とみなすか（端末の判定の簡易版。ずれてもよい） */
export function isMorningRed(r: Reminder, now: number): boolean {
  if (r.done || r.due <= now) return false
  return r.due - now <= DAY_MS || MORNING_RED_TYPES.includes(r.type)
}

function eveNotice(r: Reminder, prefs: NotifyPrefs): Notice {
  return {
    kind: 'eve',
    taskId: r.taskId,
    due: r.due,
    title: `明日 ${formatJstTime(r.due)} 締切：${noticeName(r, prefs)}`,
    body: '今夜のうちに少し進めておこう',
    tag: `task:${r.taskId}`,
  }
}

function h3Notice(r: Reminder, prefs: NotifyPrefs): Notice {
  return {
    kind: 'h3',
    taskId: r.taskId,
    due: r.due,
    title: `あと${formatLead(prefs.h3Lead)}：${noticeName(r, prefs)}`,
    body: `${formatJstTime(r.due)} 締切だよ`,
    tag: `task:${r.taskId}`,
  }
}

function morningNotice(reds: Reminder[], prefs: NotifyPrefs, day: number): Notice {
  const first = [...reds].sort((a, b) => a.due - b.due)[0]
  return {
    kind: 'morning',
    taskId: MORNING_TASK_ID,
    due: day,
    title: `今日の赤タッグ ${reds.length}件`,
    body: `まず${noticeName(first, prefs)}から`,
    tag: 'morning',
  }
}

// ---- 送るべき通知 ----

/**
 * いま送るべき通知の一覧。
 * sent には送信済みの sentKey() が入る。締切を変えるとキーが変わるので、送り直しになる。
 */
export function pendingNotices(
  reminders: readonly Reminder[],
  prefs: NotifyPrefs,
  now: number,
  sent: ReadonlySet<string>,
): Notice[] {
  const notices: Notice[] = []
  const isNew = (taskId: string, kind: NoticeKind, due: number) =>
    !sent.has(sentKey(taskId, kind, due))

  for (const r of reminders) {
    // 完了済み・期限切れには送らない
    if (r.done || r.due <= now) continue
    if (
      prefs.eve &&
      isInWindow(eveAt(r.due, prefs.eveTime), now) &&
      isNew(r.taskId, 'eve', r.due)
    ) {
      notices.push(eveNotice(r, prefs))
    }
    if (prefs.h3 && isInWindow(h3At(r.due, prefs.h3Lead), now) && isNew(r.taskId, 'h3', r.due)) {
      notices.push(h3Notice(r, prefs))
    }
  }

  const at = prefs.morning ? morningDueAt(now, prefs.morningTime) : null
  if (at !== null) {
    // 送信記録はその日の 0:00 で残す。時刻を変えても、同じ日に二度は送らない
    const day = jstDayStart(at)
    if (isNew(MORNING_TASK_ID, 'morning', day)) {
      const reds = reminders.filter((r) => isMorningRed(r, now))
      if (reds.length > 0) notices.push(morningNotice(reds, prefs, day))
    }
  }

  return notices
}
