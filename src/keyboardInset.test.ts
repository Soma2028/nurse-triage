import { describe, expect, it } from 'vitest'
import { keyboardInset } from './keyboardInset'

describe('keyboardInset', () => {
  it('見えている下端より下の高さが、キーボードの高さ', () => {
    // iPhone 15：画面 852、キーボードが出て見えているのが 516
    expect(keyboardInset(852, { height: 516, offsetTop: 0 })).toBe(336)
    // iPhone がページを 100 ずらしたとき
    expect(keyboardInset(852, { height: 516, offsetTop: 100 })).toBe(236)
  })

  it('キーボードが出ていない・バーの出入りくらいの差なら 0', () => {
    expect(keyboardInset(852, { height: 852, offsetTop: 0 })).toBe(0)
    expect(keyboardInset(852, { height: 800, offsetTop: 0 })).toBe(0)
  })
})
