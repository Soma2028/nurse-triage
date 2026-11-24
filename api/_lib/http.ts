/**
 * Vercel Functions の入口で使う共通処理：JSON の読み取り・依存の用意・エラー時の 500。
 */
import type { SocialDeps } from './account.js'
import { neonDb } from './db.js'
import { MissingEnvError, readEnv, readSocialEnv } from './env.js'
import { bearerToken, clerkIdentity } from './identity.js'
import { neonSocialDb } from './socialDb.js'
import type { Deps, Result } from './handlers.js'
import { webPushSender } from './push.js'

/** 受け取る JSON の大きさの上限（課題200件でも余裕がある大きさ） */
const MAX_BODY_BYTES = 200_000

let deps: Deps | undefined

/** 同じインスタンスで続けて呼ばれたときは使い回す */
export function getDeps(): Deps {
  if (!deps) {
    const env = readEnv()
    deps = {
      db: neonDb(env.DATABASE_URL),
      sendPush: webPushSender({
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      }),
    }
  }
  return deps
}

export function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

/** POST・DELETE の本文（JSON）を読んで処理に渡す */
export async function handle(
  request: Request,
  run: (input: unknown, deps: Deps) => Promise<Result>,
): Promise<Response> {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json(413, { error: 'too large' })
  }
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    return json(400, { error: 'invalid json' })
  }

  try {
    const result = await run(input, getDeps())
    return json(result.status, result.body)
  } catch (e) {
    if (e instanceof MissingEnvError) {
      console.error(e.message)
      return json(500, { error: 'server not configured' })
    }
    console.error('handler failed', e)
    return json(500, { error: 'server error' })
  }
}

let socialDeps: SocialDeps | undefined

function getSocialDeps(): SocialDeps {
  if (!socialDeps) {
    const env = readSocialEnv()
    socialDeps = {
      db: neonSocialDb(env.DATABASE_URL),
      identity: clerkIdentity(env.CLERK_SECRET_KEY),
    }
  }
  return socialDeps
}

/** ログインした人向けの API。Authorization: Bearer <Clerk のセッショントークン> と、本文の JSON を処理に渡す */
export async function handleAuthed(
  request: Request,
  run: (token: string | null, input: unknown, deps: SocialDeps) => Promise<Result>,
): Promise<Response> {
  let input: unknown = undefined
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    const text = await request.text()
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return json(413, { error: 'too large' })
    }
    try {
      input = JSON.parse(text)
    } catch {
      return json(400, { error: 'invalid json' })
    }
  }
  try {
    const token = bearerToken(request.headers.get('authorization'))
    const result = await run(token, input, getSocialDeps())
    return json(result.status, result.body)
  } catch (e) {
    if (e instanceof MissingEnvError) {
      console.error(e.message)
      return json(500, { error: 'server not configured' })
    }
    console.error('handler failed', e)
    // データベースのエラーなら、その種類（SQLSTATE の5文字。中身は出さない）だけ返して、原因を探せるようにする
    const code = (e as { code?: unknown }).code
    const dbCode = typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined
    return json(500, dbCode ? { error: 'server error', dbCode } : { error: 'server error' })
  }
}
