import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { useFriends, type LookupResult } from '../social/friends'
import { clearInvite, usePendingInvite } from '../social/invite'
import { useSocialAvailable } from '../social/SocialContext'
import { useMyProfile } from '../social/useMyProfile'
import { Avatar } from './Avatar'
import { CodeCopy } from './CodeCopy'
import { Sheet } from './Sheet'

const text = 'text-sm leading-6 text-ink'
const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60'

/**
 * 招待リンク（/f/コード）から開いたときのシート。
 * ログインしてプロフィールがあれば、招待した人を出して、そのまま申請できる。
 * そうでなければ、コードと、アプリで入れる手順を出す
 */
export function InviteSheet() {
  const code = usePendingInvite()
  const available = useSocialAvailable()
  return (
    <Sheet open={code !== null} title="フレンドの招待" onClose={clearInvite}>
      {code && (available ? <SignedInvite code={code} /> : <CodeHelp code={code} />)}
    </Sheet>
  )
}

/**
 * コードを大きく出し、このブラウザ（アプリ）でコードを入れる手順を出す。
 * Safari・LINE で開いたときの「ホーム画面のアプリで入れてね」の案内は、招待の専用ページ（InvitePage）が出す
 */
function CodeHelp({ code, reason }: { code: string; reason?: 'signIn' | 'profile' }) {
  return (
    <div className="flex flex-col gap-4">
      <p className={text}>
        {reason === 'profile'
          ? '先に、せっていでプロフィールを作ってね。そのあと、フレンドの「追加と設定」でこのコードを入れてね。'
          : 'せっていでログインしてから、フレンドの「追加と設定」でこのコードを入れてね。'}
      </p>
      <CodeCopy code={code} />
    </div>
  )
}

const RELATION_TEXT: Record<string, string> = {
  friends: 'もうフレンドだよ。',
  requested: 'もう申請しているよ。承認を待ってね。',
  blocked: 'ブロックしている人だよ。フレンドのシートから、ブロックを外せるよ。',
}

const ERROR_TEXT: Record<string, string> = {
  rate_limited: '続けて何回も試したので、少し時間をおいてから開いてね。',
  not_found: '招待が見つからなかったよ。コードが作り直されたのかも。',
  self: '自分の招待リンクだよ。友だちに送ってね。',
}

/** ログインの機能が使えるとき：ログイン・プロフィールの状態に合わせて出し分ける */
function SignedInvite({ code }: { code: string }) {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMyProfile()
  const friends = useFriends(!!me.profile)
  const [found, setFound] = useState<LookupResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const { lookup, act } = friends
  const ready = isSignedIn && !!me.profile

  // ログインしてプロフィールがあれば、だれからの招待かを調べる
  useEffect(() => {
    if (!ready) return
    let alive = true
    void lookup(code).then((r) => alive && setFound(r))
    return () => {
      alive = false
    }
  }, [ready, code, lookup])

  if (!isLoaded) return <p className="text-sm text-ink-muted">つないでいるよ</p>
  if (!isSignedIn) return <CodeHelp code={code} reason="signIn" />
  if (me.status === 'loading') return <p className="text-sm text-ink-muted">読み込んでいるよ</p>
  if (!me.profile) return <CodeHelp code={code} reason="profile" />
  if (!found) return <p className="text-sm text-ink-muted">招待を調べているよ</p>
  if ('error' in found) {
    return (
      <p className={text}>
        {ERROR_TEXT[found.error] ??
          'うまく調べられなかったよ。電波のいいところで、もう一度開いてね。'}
      </p>
    )
  }

  const { person, relation } = found
  const respond = async () => {
    setBusy(true)
    const r = await act(
      relation === 'requestedBy'
        ? { action: 'accept', userId: person.userId }
        : { action: 'request', code },
    )
    setBusy(false)
    setDone(
      r.error
        ? 'うまくいかなかったよ。電波のいいところで、もう一度試してね。'
        : r.result === 'friends'
          ? 'フレンドになったよ。'
          : '申請したよ。相手が承認するとフレンドになるよ。',
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 px-4">
        <Avatar icon={person.icon} photo={person.photo} size="lg" zoomable />
        <p className="min-w-0 text-base text-ink">
          <span className="font-bold break-all">{person.nickname}</span>
          さんからの招待だよ。
        </p>
      </div>
      {done ? (
        <p aria-live="polite" className={text}>
          {done}
        </p>
      ) : RELATION_TEXT[relation] ? (
        <p className={text}>{RELATION_TEXT[relation]}</p>
      ) : (
        <button type="button" onClick={respond} disabled={busy} className={primaryBtn}>
          {relation === 'requestedBy' ? '承認してフレンドになる' : 'フレンドを申請する'}
        </button>
      )}
    </div>
  )
}
