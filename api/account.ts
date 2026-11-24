// 退会：ログインした人のアカウントと、サーバーにあるその人のデータを消す
import { deleteAccount } from './_lib/account.js'
import { handleAuthed } from './_lib/http.js'

export function DELETE(request: Request) {
  return handleAuthed(request, (token, _input, deps) => deleteAccount(token, deps))
}
