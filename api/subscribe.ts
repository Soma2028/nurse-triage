// 通知の宛先を登録・解除する
import { subscribe, unsubscribe } from './_lib/handlers.js'
import { handle } from './_lib/http.js'

export function POST(request: Request) {
  return handle(request, subscribe)
}

export function DELETE(request: Request) {
  return handle(request, unsubscribe)
}
