/**
 * バックアップ（書き出し・読み込み）。課題・完了・予定・せってい・今日進めた時間・時間割を1つの JSON にする。
 * 端末の中だけで作り・読み、サーバーには送らない
 */
import { dayKey } from '../logic/schedule'
import { toPersisted, type Persisted } from './storage'

/** ファイルの目印。ほかのアプリの JSON をまちがえて読み込まないように */
export const BACKUP_APP = 'nurse-triage'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string // ISO 8601
  data: Persisted
}

/** 書き出す中身（JSON の文字列） */
export function makeBackup(data: Persisted, now: number): string {
  const { tasks, done, settings, schedule, today, timetable } = data
  const file: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    data: { tasks, done, settings, schedule, today, timetable },
  }
  return JSON.stringify(file, null, 2)
}

/** ファイル名（「kango-triage-2026-11-26.json」） */
export const backupFileName = (now: number) => `kango-triage-${dayKey(now)}.json`

export type ReadResult =
  | { ok: true; data: Persisted; exportedAt: number | null }
  | { ok: false; reason: 'not_json' | 'not_backup' | 'newer' }

/** 読み込んだファイルの中身を確かめる。このアプリのバックアップでなければ断る */
export function readBackup(text: string): ReadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'not_json' }
  }
  const f = parsed as Partial<BackupFile> | null
  if (!f || typeof f !== 'object' || f.app !== BACKUP_APP || typeof f.version !== 'number') {
    return { ok: false, reason: 'not_backup' }
  }
  // これより新しい版のアプリで書き出したものは、形がちがうかもしれないので読まない
  if (f.version > BACKUP_VERSION) return { ok: false, reason: 'newer' }
  const data = toPersisted(f.data)
  if (!data) return { ok: false, reason: 'not_backup' }
  const at = typeof f.exportedAt === 'string' ? Date.parse(f.exportedAt) : NaN
  return { ok: true, data, exportedAt: Number.isNaN(at) ? null : at }
}
