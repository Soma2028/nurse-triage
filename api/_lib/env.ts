/**
 * 環境変数の読み出し。値は Vercel の Environment Variables に入れる（リポジトリには入れない）。
 */
const NAMES = [
  'DATABASE_URL',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'CRON_SECRET',
] as const

export type Env = Record<(typeof NAMES)[number], string>

export class MissingEnvError extends Error {}

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const missing = NAMES.filter((n) => !source[n])
  // 値そのものはログに出さない（名前だけ）
  if (missing.length > 0) throw new MissingEnvError(`環境変数がない: ${missing.join(', ')}`)
  return Object.fromEntries(NAMES.map((n) => [n, source[n]])) as Env
}
