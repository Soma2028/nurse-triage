// フレンド：一覧を読む・申請・承認・断る・取り消す・やめる・ブロック・コードの作り直し
import { getFriends, postFriends } from './_lib/friends.js'
import { handleAuthed } from './_lib/http.js'

export function GET(request: Request) {
  return handleAuthed(request, (token, _input, deps) => getFriends(token, deps))
}

export function POST(request: Request) {
  return handleAuthed(request, postFriends)
}
