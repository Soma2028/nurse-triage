import { describe, expect, it } from 'vitest'
import { codeFromText } from './invite'

describe('codeFromText', () => {
  it('コードそのものでも、招待リンクでも取り出せる', () => {
    expect(codeFromText('abcd-1234')).toBe('ABCD1234')
    expect(codeFromText(' ABCD1234 \n')).toBe('ABCD1234')
    expect(
      codeFromText('https://nurse-triage-amber.vercel.app/f/ABCD1234?openExternalBrowser=1'),
    ).toBe('ABCD1234')
    expect(codeFromText('看護トリアージでフレンドになろう https://x.vercel.app/f/wxyz9876')).toBe(
      'WXYZ9876',
    )
  })

  it('コードらしくないものは null', () => {
    expect(codeFromText('')).toBeNull()
    expect(codeFromText('こんにちは')).toBeNull()
    expect(codeFromText('ab')).toBeNull()
    expect(codeFromText('https://example.com/')).toBeNull()
  })
})
