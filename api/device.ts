// 通知の端末に、ログインした人を付ける・外す（応援を通知で届けるため）
import { linkDevice, unlinkDevice } from './_lib/device.js'
import { handleAuthed } from './_lib/http.js'

export function POST(request: Request) {
  return handleAuthed(request, linkDevice)
}

export function DELETE(request: Request) {
  return handleAuthed(request, unlinkDevice)
}
