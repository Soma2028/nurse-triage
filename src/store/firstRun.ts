/**
 * 初めて開いたか（ホーム画面に追加し直したときも、端末の保存は空なので「初めて」になる）。
 * main.tsx で、ストアが保存する前に1回だけ調べる（ストアは開いた直後にサンプルの課題を保存するため）
 */
import { STORAGE_KEY } from './storage'

const WELCOMED_KEY = 'nurse-triage-welcomed'

export function isFirstRun(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null && localStorage.getItem(WELCOMED_KEY) === null
  } catch {
    return false // 読めない端末では、はじめの画面を出さずにそのまま使ってもらう
  }
}

/** はじめの画面を済ませた（次からは出さない） */
export function markWelcomed(): void {
  try {
    localStorage.setItem(WELCOMED_KEY, '1')
  } catch {
    // 保存できなくても、この起動の間は出さない
  }
}
