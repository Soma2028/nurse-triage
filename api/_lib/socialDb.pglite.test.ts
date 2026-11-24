/**
 * 本物の SQL を、手元の Postgres（PGlite）で動かして確かめる。
 * migrations の SQL を全部実行したときと、新しい SQL をまだ実行していないときの両方。
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { SocialDeps } from './account.js'
import { getFriends, postFriends } from './friends.js'
import { pgliteSql } from './pgliteSql.js'
import { getProfile, putProfile } from './profile.js'
import { patchShare, putProgress } from './progress.js'
import { NotReadyError, sqlSocialDb } from './socialDb.js'

const migration = (name: string) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8')
const ALL = [
  '001_init.sql',
  '002_social.sql',
  '003_blocks.sql',
  '004_rate_limits.sql',
  '005_profile_photo.sql',
]
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64')}`

async function setup(files: string[], extra = '') {
  const pg = new PGlite()
  for (const f of files) await pg.exec(migration(f))
  if (extra) await pg.exec(extra)
  const deps: SocialDeps = {
    db: sqlSocialDb(pgliteSql(pg)),
    identity: {
      verify: vi.fn(async (t: string) => ({ ta: 'user_a', tb: 'user_b' })[t] ?? null),
      deleteUser: vi.fn(async () => {}),
    },
  }
  const profile = (token: string, nickname: string, photo: string | null = null) =>
    putProfile(token, { nickname, icon: 'cat', grade: null, bio: '', photo }, deps)
  const friends = async (token: string) =>
    (await getFriends(token, deps)).body as Record<
      string,
      { nickname: string; photo?: unknown; progress?: unknown }[]
    >
  /** a と b をフレンドにする */
  const befriend = async () => {
    const b = (await profile('tb', 'ベニ')).body.profile as { friendCode: string }
    await postFriends('ta', { action: 'request', code: b.friendCode }, deps)
    await postFriends('tb', { action: 'accept', userId: 'user_a' }, deps)
  }
  return { pg, deps, profile, friends, befriend }
}

describe('SQL（migrations を全部実行したとき）', () => {
  it('写真つきのプロフィール・フレンド・応援・進み具合・ブロックが動く', async () => {
    const { deps, profile, friends, befriend } = await setup(ALL)
    expect((await profile('ta', 'あおい', JPEG)).body.profile).toMatchObject({ photo: JPEG })
    await befriend()
    await postFriends('ta', { action: 'cheer', userId: 'user_b', stamp: 'erai' }, deps)
    await putProgress('ta', { day: '2026-11-24', doneCount: 2, redCount: 1 }, deps)

    const b = await friends('tb')
    expect(b.friends.map((p) => [p.nickname, p.photo])).toEqual([['あおい', JPEG]])
    expect(b.friends[0]).toMatchObject({
      progress: { day: '2026-11-24', doneCount: 2, redCount: 1 },
    })
    expect(b.cheers).toHaveLength(1)

    await postFriends('tb', { action: 'block', userId: 'user_a' }, deps)
    const after = await friends('tb')
    expect(after.blocked.map((p) => p.nickname)).toEqual(['あおい'])
    expect(after.friends).toEqual([])
    expect(after.cheers).toEqual([]) // ブロックした人の応援は出さない
  })
})

describe('SQL（新しい SQL をまだ実行していないとき）', () => {
  it('写真の列（005）・ブロック（003）がなくても、プロフィールとフレンドは読める', async () => {
    const { deps, profile, friends, befriend } = await setup(['001_init.sql', '002_social.sql'])
    // 写真は置けないが、ほかは保存できる
    expect((await profile('ta', 'あおい', JPEG)).body.profile).toMatchObject({
      nickname: 'あおい',
      photo: null,
    })
    expect((await getProfile('ta', deps)).body).toMatchObject({ profile: { nickname: 'あおい' } })
    await befriend()
    await postFriends('ta', { action: 'cheer', userId: 'user_b', stamp: 'erai' }, deps)
    const b = await friends('tb')
    expect(b.friends.map((p) => p.nickname)).toEqual(['あおい'])
    expect(b.blocked).toEqual([])
    expect(b.cheers).toHaveLength(1)
    // ブロックだけは「まだ準備中」で断る
    await expect(postFriends('tb', { action: 'block', userId: 'user_a' }, deps)).rejects.toThrow(
      NotReadyError,
    )
  })

  it('応援・進み具合のテーブルがなくても、フレンドは読める（その操作だけ断る）', async () => {
    const { deps, profile, friends, befriend } = await setup(
      ALL,
      'drop table cheers; drop table progress;',
    )
    await profile('ta', 'あおい')
    await befriend()
    const b = await friends('tb')
    expect(b.friends.map((p) => [p.nickname, p.progress])).toEqual([['あおい', null]])
    expect(b.cheers).toEqual([])
    await expect(
      putProgress('ta', { day: '2026-11-24', doneCount: 1, redCount: 0 }, deps),
    ).rejects.toThrow(NotReadyError)
    await expect(patchShare('ta', { share: false }, deps)).rejects.toThrow(NotReadyError)
    await expect(
      postFriends('ta', { action: 'cheer', userId: 'user_b', stamp: 'erai' }, deps),
    ).rejects.toThrow(NotReadyError)
  })

  it('あとから SQL を実行すれば、次の操作からすぐ使える', async () => {
    const { pg, deps, profile, befriend, friends } = await setup(['001_init.sql', '002_social.sql'])
    await profile('ta', 'あおい')
    await befriend()
    await expect(postFriends('tb', { action: 'block', userId: 'user_a' }, deps)).rejects.toThrow(
      NotReadyError,
    )
    await pg.exec(migration('003_blocks.sql'))
    expect((await postFriends('tb', { action: 'block', userId: 'user_a' }, deps)).status).toBe(200)
    expect((await friends('tb')).blocked.map((p) => p.nickname)).toEqual(['あおい'])
  })
})
