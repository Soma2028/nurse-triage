// その端末にテスト通知を1件送る
import { sendTest } from './_lib/handlers.js'
import { handle } from './_lib/http.js'

export function POST(request: Request) {
  return handle(request, sendTest)
}
