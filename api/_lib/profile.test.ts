import { describe, expect, it, vi } from 'vitest'
import { FRIEND_CODE_LENGTH, getProfile, newFriendCode, putProfile } from './profile.js'
import { fakeSocial } from './socialFake.js'

const input = { nickname: 'さくら', icon: 'cat', grade: 2, bio: '実習がんばる' }

describe('profile', () => {
  it('ログインしていなければ 401', async () => {
    const { deps } = fakeSocial()
    expect((await getProfile(null, deps)).status).toBe(401)
    expect((await putProfile('bad', input, deps)).status).toBe(401)
  })

  it('まだ作っていなければ null、作るとフレンドコードが付く', async () => {
    const { deps } = fakeSocial()
    expect((await getProfile('good', deps)).body).toEqual({ profile: null })
    const r = await putProfile('good', input, deps)
    expect(r.status).toBe(200)
    const profile = r.body.profile as { friendCode: string }
    expect(profile).toMatchObject(input)
    expect(profile.friendCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    expect((await getProfile('good', deps)).body).toEqual({ profile })
  })

  it('直してもフレンドコードは変わらない。前後の空白は取る', async () => {
    const { deps } = fakeSocial()
    const first = (await putProfile('good', input, deps)).body.profile as { friendCode: string }
    const r = await putProfile(
      'good',
      { ...input, nickname: '  さく  ', grade: null, bio: '' },
      deps,
    )
    expect(r.body.profile).toEqual({
      ...input,
      nickname: 'さく',
      grade: null,
      bio: '',
      friendCode: first.friendCode,
    })
  })

  it('フレンドコードが重なったら、別のコードでやり直す', async () => {
    const { deps, db } = fakeSocial()
    const save = vi.fn(db.saveProfile)
    save.mockResolvedValueOnce(null)
    deps.db.saveProfile = save
    expect((await putProfile('good', input, deps)).status).toBe(200)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[0][2]).not.toBe(save.mock.calls[1][2])
  })

  it.each([
    ['ニックネームが空', { ...input, nickname: '   ' }],
    ['ニックネームが13文字', { ...input, nickname: 'あ'.repeat(13) }],
    ['ひとことが41文字', { ...input, bio: 'あ'.repeat(41) }],
    ['改行が入っている', { ...input, nickname: 'さ\nくら' }],
    ['知らないアイコン', { ...input, icon: 'dragon' }],
    ['学年が5', { ...input, grade: 5 }],
    ['余分な項目', { ...input, friendCode: 'AAAAAAAA' }],
  ])('%s なら 400', async (_, bad) => {
    const { deps } = fakeSocial()
    expect((await putProfile('good', bad, deps)).status).toBe(400)
  })

  it('絵文字は1文字として数える（12文字まで）', async () => {
    const { deps } = fakeSocial()
    expect((await putProfile('good', { ...input, nickname: '🌸'.repeat(12) }, deps)).status).toBe(
      200,
    )
  })

  it('newFriendCode：8文字で、見分けにくい文字を使わない', () => {
    for (let i = 0; i < 200; i++) {
      const code = newFriendCode()
      expect(code).toHaveLength(FRIEND_CODE_LENGTH)
      expect(code).not.toMatch(/[01OIL]/)
    }
  })
})
