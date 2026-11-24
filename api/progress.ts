// 今日の進み具合（今日完了にした数・赤の数だけ）を置く・見せるかを切り替える
import { handleAuthed } from './_lib/http.js'
import { patchShare, putProgress } from './_lib/progress.js'

export function PUT(request: Request) {
  return handleAuthed(request, putProgress)
}

export function PATCH(request: Request) {
  return handleAuthed(request, patchShare)
}
