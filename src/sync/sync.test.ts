import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { MAX_SYNC_TASKS, buildSyncBody } from './payload'
import {
  DEFAULT_PREFS,
  INITIAL_PUSH_STATE,
  PUSH_STORAGE_KEY,
  loadPushState,
  newCredentials,
  savePushState,
} from './pushState'
import { detectSupport, isIOS, vapidKeyToBytes, type SupportEnv } from './support'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36'

const env = (over: Partial<SupportEnv> = {}): SupportEnv => ({
  userAgent: ANDROID,
  maxTouchPoints: 5,
  standalone: false,
  displayStandalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  ...over,
})

describe('detectSupport', () => {
  it('iPhone の Safari（ホーム画面から開いていない）→ ホーム画面に追加の案内', () => {
    // Safari では PushManager がないが、それより先に案内を出す
    expect(
      detectSupport(env({ userAgent: IPHONE, hasPushManager: false, hasNotification: false })),
    ).toBe('ios-browser')
  })

  it('iPhone のホーム画面から開いた → 使える', () => {
    expect(detectSupport(env({ userAgent: IPHONE, standalone: true }))).toBe('ok')
  })

  it('iPhone のホーム画面から開いても、古い iOS（PushManager なし）→ 使えない', () => {
    expect(detectSupport(env({ userAgent: IPHONE, standalone: true, hasPushManager: false }))).toBe(
      'unsupported',
    )
  })

  it('iPad（Mac のふりをする Safari）も iOS として扱う', () => {
    expect(isIOS({ userAgent: MAC_SAFARI, maxTouchPoints: 5 })).toBe(true)
    expect(isIOS({ userAgent: MAC_SAFARI, maxTouchPoints: 0 })).toBe(false)
    expect(detectSupport(env({ userAgent: MAC_SAFARI, maxTouchPoints: 5 }))).toBe('ios-browser')
  })

  it('Mac の Safari・Android・PC のブラウザはそのまま使える', () => {
    expect(detectSupport(env({ userAgent: MAC_SAFARI, maxTouchPoints: 0 }))).toBe('ok')
    expect(detectSupport(env())).toBe('ok')
  })

  it('service worker・通知がない → 使えない', () => {
    expect(detectSupport(env({ hasServiceWorker: false }))).toBe('unsupported')
    expect(detectSupport(env({ hasNotification: false }))).toBe('unsupported')
  })
})

describe('vapidKeyToBytes', () => {
  it('URL セーフな base64（パディングなし）をバイト列にする', () => {
    // 0xfb 0xff 0xbf は標準の base64 だと "+/+/"、URL セーフだと "-_-_"
    expect([...vapidKeyToBytes('-_-_')]).toEqual([0xfb, 0xff, 0xbf])
    expect([...vapidKeyToBytes('AQID')]).toEqual([1, 2, 3])
    expect([...vapidKeyToBytes('AQ')]).toEqual([1])
  })
})

describe('pushState の保存', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
      m,
    }
  }

  it('ない・壊れているときは初期値（通知はオフ、課題名は出さない）', () => {
    expect(loadPushState(mem())).toEqual(INITIAL_PUSH_STATE)
    const s = mem()
    s.setItem(PUSH_STORAGE_KEY, '{broken')
    expect(loadPushState(s)).toEqual(INITIAL_PUSH_STATE)
    expect(INITIAL_PUSH_STATE.prefs.showTitle).toBe(false)
  })

  it('保存して読み戻せる', () => {
    const s = mem()
    const state = {
      ...INITIAL_PUSH_STATE,
      deviceId: 'd',
      secret: 's',
      enabled: true,
      endpoint: 'https://e',
      prefs: { ...DEFAULT_PREFS, morning: false },
    }
    savePushState(state, s)
    expect(loadPushState(s)).toEqual(state)
  })

  it('名札がないのに「オン」になっていたらオフとして読む', () => {
    const s = mem()
    s.setItem(PUSH_STORAGE_KEY, JSON.stringify({ enabled: true }))
    expect(loadPushState(s).enabled).toBe(false)
  })

  it('newCredentials：uuid と、サーバーの条件（32〜128文字）に合う secret', () => {
    const a = newCredentials()
    const b = newCredentials()
    expect(a.deviceId).toMatch(/^[0-9a-f-]{36}$/)
    expect(a.secret).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a.secret).not.toBe(b.secret)
  })
})

describe('buildSyncBody', () => {
  const task = (over: Partial<Task> = {}): Task => ({
    id: 't1',
    title: '関連図の修正（A氏・心不全）',
    type: 'proc',
    due: 1_800_000_000_000,
    estHours: 5,
    progress: 30,
    importance: 3,
    ...over,
  })

  it('課題名を出さない設定（初期）では、課題名を入れない', () => {
    const body = buildSyncBody([task()], DEFAULT_PREFS)
    expect(body.tasks).toEqual([{ id: 't1', type: 'proc', due: 1_800_000_000_000, done: false }])
    expect(JSON.stringify(body)).not.toContain('A氏')
    expect(body.settings).toEqual(DEFAULT_PREFS)
  })

  it('課題名を出す設定では入れる（空白だけなら入れない）', () => {
    const prefs = { ...DEFAULT_PREFS, showTitle: true }
    const body = buildSyncBody([task(), task({ id: 't2', title: '  ' })], prefs)
    expect(body.tasks[0].title).toBe('関連図の修正（A氏・心不全）')
    expect(body.tasks[1]).not.toHaveProperty('title')
  })

  it('並び順が違っても同じ中身になる（送り直しの判定がぶれない）', () => {
    const a = task({ id: 'a', due: 2 })
    const b = task({ id: 'b', due: 1 })
    expect(JSON.stringify(buildSyncBody([a, b], DEFAULT_PREFS))).toBe(
      JSON.stringify(buildSyncBody([b, a], DEFAULT_PREFS)),
    )
  })

  it(`${MAX_SYNC_TASKS}件を超えたら、締切の遅いほうを残す`, () => {
    const many = Array.from({ length: MAX_SYNC_TASKS + 5 }, (_, i) => task({ id: `t${i}`, due: i }))
    const body = buildSyncBody(many, DEFAULT_PREFS)
    expect(body.tasks).toHaveLength(MAX_SYNC_TASKS)
    expect(body.tasks[0].due).toBe(5)
  })
})
