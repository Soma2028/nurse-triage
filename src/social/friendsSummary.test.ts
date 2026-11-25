import { describe, expect, it } from 'vitest'
import { summarize } from './friendsSummary'

const cache = (friends: unknown[]) => JSON.stringify({ userId: 'u', data: { friends } })

describe('summarize', () => {
  it('今日1つ以上完了にした人だけを数える', () => {
    const raw = cache([
      { progress: { day: '2026-11-25', doneCount: 2 } },
      { progress: { day: '2026-11-25', doneCount: 0 } },
      { progress: { day: '2026-11-24', doneCount: 5 } },
      { progress: null },
      {},
    ])
    expect(summarize(raw, '2026-11-25')).toEqual({ total: 5, active: 1 })
  })

  it('保存がない・壊れているときは null', () => {
    expect(summarize(null, '2026-11-25')).toBeNull()
    expect(summarize('{oops', '2026-11-25')).toBeNull()
    expect(summarize(JSON.stringify({ data: {} }), '2026-11-25')).toBeNull()
  })
})
