import { describe, expect, it, vi } from 'vitest'
import { hashSecret } from './auth.js'
import { linkDevice, unlinkDevice } from './device.js'
import { MAX_CHEERS_PER_DAY, getFriends, postFriends } from './friends.js'
import type { PushResult, SendPush } from './push.js'
import { fakeSocial } from './socialFake.js'

const SECRET = 'x'.repeat(43)
const DEVICE = '11111111-1111-4111-8111-111111111111'

/** a と b がフレンド、c はフレンドではない。b の端末に通知の宛先がある */
async function setup(pushResult: PushResult = 'ok') {
  const s = fakeSocial({ ta: 'a', tb: 'b', tc: 'c' })
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
  await postFriends('ta', { action: 'request', code: 'BBBB3333' }, s.deps)
  await postFriends('tb', { action: 'accept', userId: 'a' }, s.deps)
  s.devices.set(DEVICE, { secretHash: hashSecret(SECRET), userId: null })
  s.subs.set('https://push/b', {
    endpoint: 'https://push/b',
    p256dh: 'p',
    auth: 'q',
    deviceId: DEVICE,
  })
  const sendPush = vi.fn<SendPush>(async () => pushResult)
  s.deps.sendPush = sendPush
  const cheer = (token: string, userId: string, stamp = 'ganbare') =>
    postFriends(token, { action: 'cheer', userId, stamp }, s.deps, s.clock.now)
  return { ...s, sendPush, cheer }
}

describe('応援', () => {
  it('フレンドに送ると、相手の一覧の「届いた応援」に出る', async () => {
    const { deps, cheer } = await setup()
    expect((await cheer('ta', 'b')).body).toMatchObject({ result: 'cheered' })
    const body = (await getFriends('tb', deps)).body as {
      cheers: { from: { nickname: string }; stamp: string }[]
    }
    expect(body.cheers.map((c) => [c.from.nickname, c.stamp])).toEqual([['あおい', 'ganbare']])
  })

  it('フレンドでない人・知らないスタンプには送れない', async () => {
    const { cheer } = await setup()
    expect((await cheer('ta', 'c')).body).toEqual({ error: 'not_found' })
    expect((await cheer('ta', 'b', 'hack')).status).toBe(400)
  })

  it(`同じ相手には1日${MAX_CHEERS_PER_DAY}回まで。日本時間の次の日になればまた送れる`, async () => {
    const { cheer, clock } = await setup()
    for (let i = 0; i < MAX_CHEERS_PER_DAY; i++) {
      expect((await cheer('ta', 'b')).status).toBe(200)
    }
    expect((await cheer('ta', 'b')).body).toEqual({ error: 'cheer_limit' })
    clock.now = Date.UTC(2026, 10, 24, 15) // 日本時間 11/25 0:00
    expect((await cheer('ta', 'b')).status).toBe(200)
  })

  it('ブロックしたら、その人の応援は見えず、送ることもできない', async () => {
    const { deps, cheer } = await setup()
    await cheer('ta', 'b')
    await postFriends('tb', { action: 'block', userId: 'a' }, deps)
    expect(((await getFriends('tb', deps)).body as { cheers: unknown[] }).cheers).toEqual([])
    expect((await cheer('ta', 'b')).body).toEqual({ error: 'not_found' })
  })

  it('相手の端末にログインが付いていれば、通知で届く（課題のことは書かない）', async () => {
    const { deps, cheer, sendPush } = await setup()
    await cheer('ta', 'b')
    expect(sendPush).not.toHaveBeenCalled() // まだ端末にログインが付いていない

    expect((await linkDevice('tb', { deviceId: DEVICE, secret: SECRET }, deps)).status).toBe(200)
    await cheer('ta', 'b', 'otsukare')
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush.mock.calls[0][1]).toEqual({
      title: 'あおいさんから応援が届いたよ',
      body: 'おつかれ',
      tag: 'cheer',
      url: '/',
    })

    // ログアウトで外したら、もう届かない
    await unlinkDevice('tb', { deviceId: DEVICE, secret: SECRET }, deps)
    await cheer('ta', 'b')
    expect(sendPush).toHaveBeenCalledTimes(1)
  })

  it('「もうない」と言われた宛先は消す。通知に失敗しても応援は送れたことにする', async () => {
    const gone = await setup('gone')
    await linkDevice('tb', { deviceId: DEVICE, secret: SECRET }, gone.deps)
    expect((await gone.cheer('ta', 'b')).status).toBe(200)
    expect(gone.subs.size).toBe(0)

    const broken = await setup()
    await linkDevice('tb', { deviceId: DEVICE, secret: SECRET }, broken.deps)
    broken.sendPush.mockRejectedValueOnce(new Error('push down'))
    expect((await broken.cheer('ta', 'b')).status).toBe(200)
  })

  it('端末の secret が合わなければ、ログインを付けられない', async () => {
    const { deps, devices } = await setup()
    expect(
      (await linkDevice('tb', { deviceId: DEVICE, secret: 'y'.repeat(43) }, deps)).status,
    ).toBe(404)
    expect((await linkDevice(null, { deviceId: DEVICE, secret: SECRET }, deps)).status).toBe(401)
    expect(devices.get(DEVICE)!.userId).toBeNull()
    // ほかの人の端末からは外せない
    await linkDevice('tb', { deviceId: DEVICE, secret: SECRET }, deps)
    await unlinkDevice('ta', { deviceId: DEVICE, secret: SECRET }, deps)
    expect(devices.get(DEVICE)!.userId).toBe('b')
  })
})
