import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { alertMessage, alertOwner, sqlErrorLog } from './errorLog.js'
import { pgliteSql } from './pgliteSql.js'

const migration = (name: string) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8')

const target = { endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' }

describe('エラーの記録と持ち主への知らせ', () => {
  it('記録したエラーを1回だけ知らせ、30日より前の記録は消す', async () => {
    const pg = new PGlite()
    await pg.exec(migration('006_api_errors.sql'))
    const log = sqlErrorLog(pgliteSql(pg))
    await log.record('/api/friends', 500, '42P01')
    await log.record('/api/profile', 500)

    const send = vi.fn(async () => 'ok' as const)
    expect(await alertOwner(log, async () => [target], send)).toBe(2)
    expect(send).toHaveBeenCalledWith(target, alertMessage(2), { ttlSeconds: 86400 })
    // 知らせたものは、もう一度は知らせない
    expect(await alertOwner(log, async () => [target], send)).toBe(0)
    expect(send).toHaveBeenCalledTimes(1)

    await pg.exec(
      `update api_errors set at = now() - interval '31 days' where route = '/api/friends'`,
    )
    await log.prune(Date.now())
    const rows = await pg.query<{ route: string }>('select route from api_errors')
    expect(rows.rows.map((r) => r.route)).toEqual(['/api/profile'])
  })

  it('テーブルがまだなくても、記録・知らせは止まらない', async () => {
    const pg = new PGlite()
    const log = sqlErrorLog(pgliteSql(pg))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(log.record('/api/friends', 500)).resolves.toBeUndefined()
    const send = vi.fn(async () => 'ok' as const)
    expect(await alertOwner(log, async () => [target], send)).toBe(0)
    expect(send).not.toHaveBeenCalled()
    await expect(log.prune(Date.now())).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
