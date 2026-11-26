import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import { emptyTimetable } from '../logic/timetable'
import { backupFileName, makeBackup, readBackup } from './backup'
import type { Persisted } from './storage'

const NOW = new Date('2026-11-26T10:00:00+09:00').getTime()

const data: Persisted = {
  tasks: [
    {
      id: 'a',
      title: '実習記録',
      type: 'rec',
      due: NOW + 1e8,
      estHours: 2,
      progress: 20,
      importance: 3,
    },
  ],
  done: [],
  settings: { ...DEFAULT_SETTINGS, hoursNormal: 5 },
  schedule: { '2026-11-27': 'practice' },
  today: { day: '2026-11-26', hours: 1 },
  timetable: emptyTimetable(),
}

describe('backup', () => {
  it('書き出したものをそのまま読み戻せる', () => {
    const r = readBackup(makeBackup(data, NOW))
    expect(r).toEqual({ ok: true, data, exportedAt: NOW })
  })

  it('ファイル名は日付入り', () => {
    expect(backupFileName(NOW)).toBe('kango-triage-2026-11-26.json')
  })

  it('JSON でない・このアプリのものでない・新しすぎる版は断る', () => {
    expect(readBackup('oops')).toEqual({ ok: false, reason: 'not_json' })
    expect(readBackup('{"tasks":[]}')).toEqual({ ok: false, reason: 'not_backup' })
    expect(readBackup('{"app":"nurse-triage","version":99,"data":{}}')).toEqual({
      ok: false,
      reason: 'newer',
    })
  })

  it('おかしな課題は捨て、足りないところは初期値で補う', () => {
    const text = JSON.stringify({
      app: 'nurse-triage',
      version: 1,
      data: { tasks: [data.tasks[0], { id: 'x', title: 1 }] },
    })
    const r = readBackup(text)
    expect(r.ok && r.data.tasks).toEqual(data.tasks)
    expect(r.ok && r.data.settings).toEqual(DEFAULT_SETTINGS)
    expect(r.ok && r.exportedAt).toBeNull()
  })
})
