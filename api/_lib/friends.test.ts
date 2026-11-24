import { describe, expect, it } from 'vitest'
import { MAX_FRIENDS, getFriends, postFriends } from './friends.js'
import { fakeSocial } from './socialFake.js'

/** a・b・c の3人がプロフィールを作った状態 */
function setup() {
  const s = fakeSocial({ ta: 'a', tb: 'b', tc: 'c', tn: 'nobody' })
  const make = (id: string, nickname: string, code: string) =>
    s.profiles.set(id, {
      nickname,
      icon: 'cat',
      grade: null,
      bio: '',
      photo: null,
      friendCode: code,
      shareProgress: true,
    })
  make('a', 'あおい', 'AAAA2222')
  make('b', 'ベニ', 'BBBB3333')
  make('c', 'ちか', 'CCCC4444')
  const post = (token: string, body: unknown) => postFriends(token, body, s.deps)
  const names = async (token: string) => {
    const r = await getFriends(token, s.deps)
    const b = r.body as Record<string, { nickname: string }[]>
    const n = (k: string) => b[k].map((p) => p.nickname)
    return {
      friends: n('friends'),
      incoming: n('incoming'),
      outgoing: n('outgoing'),
      blocked: n('blocked'),
    }
  }
  return { ...s, post, names }
}

describe('フレンド', () => {
  it('ログインしていない・プロフィールがなければ使えない', async () => {
    const { deps, post } = setup()
    expect((await getFriends(null, deps)).status).toBe(401)
    expect((await getFriends('tn', deps)).body).toEqual({ error: 'no_profile' })
    expect((await post('tn', { action: 'request', code: 'AAAA2222' })).status).toBe(409)
  })

  it('コードで申請 → 承認でフレンド。どちらの一覧にも出る', async () => {
    const { post, names } = setup()
    const r = await post('ta', { action: 'request', code: 'bbbb-3333' })
    expect(r.body).toMatchObject({ result: 'requested', friendCode: 'AAAA2222' })
    expect(await names('ta')).toMatchObject({ outgoing: ['ベニ'], friends: [] })
    expect(await names('tb')).toMatchObject({ incoming: ['あおい'] })

    expect((await post('tb', { action: 'accept', userId: 'a' })).body).toMatchObject({
      result: 'friends',
    })
    expect(await names('ta')).toMatchObject({ friends: ['ベニ'], outgoing: [] })
    expect(await names('tb')).toMatchObject({ friends: ['あおい'], incoming: [] })
  })

  it('おたがいに申請したら、そのままフレンドになる', async () => {
    const { post, names } = setup()
    await post('ta', { action: 'request', code: 'BBBB3333' })
    expect((await post('tb', { action: 'request', code: 'AAAA2222' })).body).toMatchObject({
      result: 'friends',
    })
    expect(await names('ta')).toMatchObject({ friends: ['ベニ'], outgoing: [], incoming: [] })
  })

  it('自分のコード・ないコード・もうフレンド', async () => {
    const { post } = setup()
    expect((await post('ta', { action: 'request', code: 'AAAA2222' })).body).toEqual({
      error: 'self',
    })
    expect((await post('ta', { action: 'request', code: 'ZZZZ9999' })).body).toEqual({
      error: 'not_found',
    })
    expect((await post('ta', { action: 'request', code: 'ABC' })).status).toBe(400)
    await post('ta', { action: 'request', code: 'BBBB3333' })
    await post('tb', { action: 'accept', userId: 'a' })
    expect((await post('ta', { action: 'request', code: 'BBBB3333' })).body).toEqual({
      error: 'already_friends',
    })
  })

  it('断る・取り消す・フレンドをやめる', async () => {
    const { post, names } = setup()
    await post('ta', { action: 'request', code: 'BBBB3333' })
    await post('tb', { action: 'decline', userId: 'a' })
    expect(await names('ta')).toMatchObject({ outgoing: [] })

    await post('ta', { action: 'request', code: 'CCCC4444' })
    await post('ta', { action: 'cancel', userId: 'c' })
    expect(await names('tc')).toMatchObject({ incoming: [] })

    await post('ta', { action: 'request', code: 'BBBB3333' })
    await post('tb', { action: 'accept', userId: 'a' })
    await post('tb', { action: 'remove', userId: 'a' })
    expect(await names('ta')).toMatchObject({ friends: [] })
  })

  it('申請が来ていない人は承認できない', async () => {
    const { post } = setup()
    expect((await post('tb', { action: 'accept', userId: 'a' })).body).toEqual({
      error: 'not_found',
    })
  })

  it('ブロック：フレンドと申請が消え、相手からは「見つからない」になる', async () => {
    const { post, names } = setup()
    await post('ta', { action: 'request', code: 'BBBB3333' })
    await post('tb', { action: 'accept', userId: 'a' })
    await post('tc', { action: 'request', code: 'BBBB3333' })

    await post('tb', { action: 'block', userId: 'a' })
    await post('tb', { action: 'block', userId: 'c' })
    expect(await names('tb')).toMatchObject({
      friends: [],
      incoming: [],
      blocked: ['あおい', 'ちか'],
    })
    expect(await names('ta')).toMatchObject({ friends: [], blocked: [] })
    expect(await names('tc')).toMatchObject({ outgoing: [] })

    // ブロックされた人の申請は、ないコードと同じ返事
    expect((await post('ta', { action: 'request', code: 'BBBB3333' })).body).toEqual({
      error: 'not_found',
    })
    // ブロックした側から申請するには、先にブロックを外す
    expect((await post('tb', { action: 'request', code: 'AAAA2222' })).body).toEqual({
      error: 'blocked',
    })
    await post('tb', { action: 'unblock', userId: 'a' })
    expect((await post('ta', { action: 'request', code: 'BBBB3333' })).body).toMatchObject({
      result: 'requested',
    })
  })

  it('コードを作り直すと、古いコードでは見つからない', async () => {
    const { post } = setup()
    const r = await post('tb', { action: 'regenerateCode' })
    const next = (r.body as { friendCode: string }).friendCode
    expect(next).not.toBe('BBBB3333')
    expect(next).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    expect((await post('ta', { action: 'request', code: 'BBBB3333' })).body).toEqual({
      error: 'not_found',
    })
    expect((await post('ta', { action: 'request', code: next })).body).toMatchObject({
      result: 'requested',
    })
  })

  it(`フレンドは${MAX_FRIENDS}人まで`, async () => {
    const { post, friendships } = setup()
    for (let i = 0; i < MAX_FRIENDS; i++) friendships.add(`a|z${String(i).padStart(3, '0')}`)
    expect((await post('ta', { action: 'request', code: 'BBBB3333' })).body).toEqual({
      error: 'limit',
    })
    await post('tb', { action: 'request', code: 'AAAA2222' })
    expect((await post('ta', { action: 'accept', userId: 'b' })).body).toEqual({ error: 'limit' })
  })

  it('lookup：招待した人と、いまの関係を返す（申請はしない）', async () => {
    const { post, names } = setup()
    expect((await post('ta', { action: 'lookup', code: 'bbbb3333' })).body).toEqual({
      person: { userId: 'b', nickname: 'ベニ', icon: 'cat', grade: null, bio: '', photo: null },
      relation: 'none',
    })
    expect(await names('tb')).toMatchObject({ incoming: [] })
    await post('ta', { action: 'request', code: 'BBBB3333' })
    expect((await post('ta', { action: 'lookup', code: 'BBBB3333' })).body).toMatchObject({
      relation: 'requested',
    })
    expect((await post('tb', { action: 'lookup', code: 'AAAA2222' })).body).toMatchObject({
      relation: 'requestedBy',
    })
    expect((await post('ta', { action: 'lookup', code: 'AAAA2222' })).body).toEqual({
      error: 'self',
    })
    // ブロックされていたら、見つからないのと同じ
    await post('tb', { action: 'block', userId: 'a' })
    expect((await post('ta', { action: 'lookup', code: 'BBBB3333' })).body).toEqual({
      error: 'not_found',
    })
  })

  it('知らない操作は 400', async () => {
    const { post } = setup()
    expect((await post('ta', { action: 'hack' })).status).toBe(400)
    expect((await post('ta', { action: 'accept' })).status).toBe(400)
  })
})
