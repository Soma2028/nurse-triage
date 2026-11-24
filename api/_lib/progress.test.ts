import { describe, expect, it } from 'vitest'
import { getFriends, postFriends } from './friends.js'
import { patchShare, putProgress } from './progress.js'
import { fakeSocial } from './socialFake.js'

/** a と b がフレンド、c はフレンドではない */
async function setup() {
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
  await postFriends('ta', { action: 'request', code: 'BBBB3333' }, s.deps)
  await postFriends('tb', { action: 'accept', userId: 'a' }, s.deps)
  /** a から見たフレンドの進み具合 */
  const seenByA = async () => {
    const body = (await getFriends('ta', s.deps)).body as {
      friends: { nickname: string; progress: unknown }[]
    }
    return body.friends.map((f) => [f.nickname, f.progress])
  }
  return { ...s, seenByA }
}

const today = { day: '2026-11-24', doneCount: 3, redCount: 1 }

describe('今日の進み具合', () => {
  it('ログイン・プロフィールがなければ置けない。形がちがえば 400', async () => {
    const { deps } = await setup()
    expect((await putProgress(null, today, deps)).status).toBe(401)
    expect((await putProgress('tn', today, deps)).status).toBe(409)
    for (const bad of [
      { ...today, day: '11/24' },
      { ...today, doneCount: -1 },
      { ...today, redCount: 1.5 },
      { ...today, title: '実習記録' }, // 課題名は受け取らない
    ]) {
      expect((await putProgress('tb', bad, deps)).status).toBe(400)
    }
  })

  it('フレンドの一覧に、数だけが出る', async () => {
    const { deps, seenByA } = await setup()
    expect(await seenByA()).toEqual([['ベニ', null]])
    expect((await putProgress('tb', today, deps)).body).toEqual({ ok: true, stored: true })
    expect(await seenByA()).toEqual([['ベニ', { ...today, updatedAt: 1 }]])
  })

  it('見せるのをやめると、置いてある分も消え、そのあとも置かれない', async () => {
    const { deps, seenByA } = await setup()
    await putProgress('tb', today, deps)
    const r = await patchShare('tb', { share: false }, deps)
    expect(r.body).toMatchObject({ profile: { shareProgress: false } })
    expect(await seenByA()).toEqual([['ベニ', null]])
    expect((await putProgress('tb', today, deps)).body).toEqual({ ok: true, stored: false })
    expect(await seenByA()).toEqual([['ベニ', null]])

    await patchShare('tb', { share: true }, deps)
    await putProgress('tb', today, deps)
    expect(await seenByA()).toEqual([['ベニ', { ...today, updatedAt: 1 }]])
  })

  it('フレンドでない人の進み具合は見えない', async () => {
    const { deps, seenByA } = await setup()
    await putProgress('tc', today, deps)
    expect(await seenByA()).toEqual([['ベニ', null]])
  })
})
