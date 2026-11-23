// cron-job.org から15分ごとに呼ばれ、送るべき通知を送る
import { cronAuthorized, runCron } from '../_lib/cron.js'
import { MissingEnvError, readEnv } from '../_lib/env.js'
import { getDeps, json } from '../_lib/http.js'

export async function GET(request: Request) {
  try {
    const env = readEnv()
    if (!cronAuthorized(request.headers.get('authorization'), env.CRON_SECRET)) {
      return json(401, { error: 'unauthorized' })
    }
    const summary = await runCron(Date.now(), getDeps())
    return json(200, { ok: true, ...summary })
  } catch (e) {
    if (e instanceof MissingEnvError) {
      console.error(e.message)
      return json(500, { error: 'server not configured' })
    }
    console.error('cron failed', e)
    return json(500, { error: 'server error' })
  }
}
