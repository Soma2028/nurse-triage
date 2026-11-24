// 通知に必要な課題データを丸ごと置き換える
import { sync } from './_lib/handlers.js'
import { handle } from './_lib/http.js'

export function POST(request: Request) {
  return handle(request, sync, 'sync')
}
