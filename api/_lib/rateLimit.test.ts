import { describe, expect, it } from 'vitest'
import { postFriends } from './friends.js'
import { putProfile } from './profile.js'
import { putProgress } from './progress.js'
import { LIMITS, clientIp, memoryRateLimiter } from './rateLimit.js'
import { fakeSocial } from './socialFake.js'

function setup() {
  const s = fakeSocial({ ta: 'a', tb: 'b' })
  s.profiles.set('a', {
    nickname: 'あおい',
    icon: 'cat',
    grade: null,
    bio: '',
    photo: null,
    friendCode: 'AAAA2222',
    shareProgress: true,
  })
  const limiter = memoryRateLimiter()
  s.deps.limiter = limiter
  return { ...s, limiter }
}

describe('回数制限', () => {
  it(`コードを使う操作は1時間に${LIMITS.code.max}回まで（総当たりで探されないように）`, async () => {
    const { deps } = setup()
    for (let i = 0; i < LIMITS.code.max; i++) {
      const r = await postFriends('ta', { action: 'lookup', code: 'ZZZZ9999' }, deps)
      expect(r.body).toEqual({ error: 'not_found' })
    }
    const over = await postFriends('ta', { action: 'request', code: 'ZZZZ9999' }, deps)
    expect(over).toEqual({ status: 429, body: { error: 'rate_limited' } })
  })

  it('コードの回数は、ほかのフレンドの操作とは別に数える', async () => {
    const { deps } = setup()
    for (let i = 0; i < LIMITS.code.max; i++) {
      await postFriends('ta', { action: 'request', code: 'ZZZZ9999' }, deps)
    }
    expect((await postFriends('ta', { action: 'cancel', userId: 'b' }, deps)).status).toBe(200)
  })

  it('人ごとに数える（ほかの人の回数には影響しない）', async () => {
    const { deps, profiles } = setup()
    profiles.set('b', { ...profiles.get('a')!, nickname: 'ベニ', friendCode: 'BBBB3333' })
    for (let i = 0; i <= LIMITS.code.max; i++) {
      await postFriends('ta', { action: 'lookup', code: 'ZZZZ9999' }, deps)
    }
    expect((await postFriends('tb', { action: 'lookup', code: 'ZZZZ9999' }, deps)).status).toBe(404)
  })

  it('プロフィールの保存・進み具合も上限を超えたら 429', async () => {
    const { deps } = setup()
    const input = { nickname: 'あおい', icon: 'cat', grade: null, bio: '' }
    for (let i = 0; i < LIMITS.profile.max; i++) await putProfile('ta', input, deps)
    expect((await putProfile('ta', input, deps)).status).toBe(429)

    const p = { day: '2026-11-24', doneCount: 1, redCount: 0 }
    for (let i = 0; i < LIMITS.progress.max; i++) await putProgress('ta', p, deps)
    expect((await putProgress('ta', p, deps)).status).toBe(429)
  })

  it('ログインしていない人は、数える前に 401（他人の枠を使わせない）', async () => {
    const { deps, limiter } = setup()
    expect((await postFriends(null, { action: 'lookup', code: 'ZZZZ9999' }, deps)).status).toBe(401)
    expect(limiter.counts.size).toBe(0)
  })

  it('clientIp：x-forwarded-for の先頭、なければ x-real-ip', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientIp(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
