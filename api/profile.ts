// 自分のプロフィールを読む・作る・直す
import { handleAuthed } from './_lib/http.js'
import { getProfile, putProfile } from './_lib/profile.js'

export function GET(request: Request) {
  return handleAuthed(request, (token, _input, deps) => getProfile(token, deps))
}

export function PUT(request: Request) {
  return handleAuthed(request, putProfile)
}
