import { createContext, useContext } from 'react'

/**
 * ログインの機能が使えるか（ClerkProvider の中にいるか）。
 * false のときは Clerk のフックを呼ぶ部品を出さない（ClerkProvider の外で呼ぶとエラーになるため）
 */
export const SocialContext = createContext(false)

export const useSocialAvailable = () => useContext(SocialContext)
