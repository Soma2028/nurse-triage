// cron-job.org から15分ごとに呼ばれ、送るべき通知を送る
import { cronAuthorized, runCron } from '../_lib/cron.js'
import { MissingEnvError, readEnv } from '../_lib/env.js'
import { getDeps, json } from '../_lib/http.js'
import { neon } from '@neondatabase/serverless'
import { alertOwner, sqlErrorLog } from '../_lib/errorLog.js'
import { neonSocialDb } from '../_lib/socialDb.js'

export async function GET(request: Request) {
  try {
    const env = readEnv()
    if (!cronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
      return json(401, { error: 'unauthorized' })
    }
    const deps = getDeps()
    const summary = await runCron(Date.now(), deps)
    // 回数制限の古い記録（1日より前）を消す
    await deps.limiter?.prune(Date.now() - 24 * 60 * 60 * 1000)
    // サーバーのエラーがあれば、持ち主（ERROR_ALERT_USER_ID の Clerk のユーザー）の端末に知らせる
    const errors = sqlErrorLog(neon(env.DATABASE_URL))
    const owner = process.env.ERROR_ALERT_USER_ID
    const alerted = owner
      ? await alertOwner(
          errors,
          () => neonSocialDb(env.DATABASE_URL).userSubscriptions(owner),
          deps.sendPush,
        )
      : 0
    await errors.prune(Date.now())
    return json(200, { ok: true, ...summary, alerted })
  } catch (e) {
    if (e instanceof MissingEnvError) {
      console.error(e.message)
      return json(500, { error: 'server not configured' })
    }
    console.error('cron failed', e)
    return json(500, { error: 'server error' })
  }
}
