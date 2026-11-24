/**
 * プロフィールの形と、選べるアイコン（api/_lib/profile.ts と同じ）。
 */
import {
  Bird,
  Cat,
  Clover,
  Dog,
  Fish,
  Flower2,
  Leaf,
  Rabbit,
  Squirrel,
  Star,
  Sun,
  Turtle,
  type LucideIcon,
} from 'lucide-react'

export const PROFILE_ICONS = [
  'cat',
  'dog',
  'rabbit',
  'bird',
  'fish',
  'turtle',
  'squirrel',
  'flower',
  'leaf',
  'clover',
  'sun',
  'star',
] as const

export type ProfileIcon = (typeof PROFILE_ICONS)[number]

export const ICONS: Record<ProfileIcon, { Icon: LucideIcon; label: string }> = {
  cat: { Icon: Cat, label: 'ねこ' },
  dog: { Icon: Dog, label: 'いぬ' },
  rabbit: { Icon: Rabbit, label: 'うさぎ' },
  bird: { Icon: Bird, label: 'とり' },
  fish: { Icon: Fish, label: 'さかな' },
  turtle: { Icon: Turtle, label: 'かめ' },
  squirrel: { Icon: Squirrel, label: 'りす' },
  flower: { Icon: Flower2, label: 'はな' },
  leaf: { Icon: Leaf, label: 'はっぱ' },
  clover: { Icon: Clover, label: 'クローバー' },
  sun: { Icon: Sun, label: 'たいよう' },
  star: { Icon: Star, label: 'ほし' },
}

export interface Profile {
  nickname: string
  icon: ProfileIcon
  grade: number | null // 1〜4。null は「ひみつ」
  bio: string
  friendCode: string
  /** 今日の進み具合をフレンドに見せるか（前の版の保存データにはないので、ないときは見せる） */
  shareProgress?: boolean
}

export type ProfileInput = Omit<Profile, 'friendCode' | 'shareProgress'>

export const NICKNAME_MAX = 12
export const BIO_MAX = 40

/** 文字数は見た目の1文字ずつで数える（サーバーと同じ） */
export const textLength = (s: string) => [...s].length

export const gradeLabel = (g: number | null) => (g === null ? '' : `${g}年生`)

export function isProfile(v: unknown): v is Profile {
  const p = v as Partial<Profile> | null
  return (
    !!p &&
    typeof p.nickname === 'string' &&
    typeof p.icon === 'string' &&
    (PROFILE_ICONS as readonly string[]).includes(p.icon) &&
    (p.grade === null || typeof p.grade === 'number') &&
    typeof p.bio === 'string' &&
    typeof p.friendCode === 'string' &&
    (p.shareProgress === undefined || typeof p.shareProgress === 'boolean')
  )
}
