import { describe, expect, it, vi } from 'vitest'
import { handle } from './http.js'

const post = (body: string) =>
  new Request('https://example.test/api/sync', { method: 'POST', body })

describe('handle', () => {
  it('JSON でなければ 400', async () => {
    const run = vi.fn()
    const res = await handle(post('{oops'), run)
    expect(res.status).toBe(400)
    expect(run).not.toHaveBeenCalled()
  })

  it('大きすぎる本文は 413', async () => {
    const res = await handle(post(JSON.stringify({ x: 'a'.repeat(200_001) })), vi.fn())
    expect(res.status).toBe(413)
  })

  it('環境変数がなければ 500「server not configured」（中身は漏らさない）', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await handle(post('{}'), vi.fn())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'server not configured' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
