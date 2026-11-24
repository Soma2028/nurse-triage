import { useAuth, useClerk, useUser } from '@clerk/react'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { authedCall } from '../social/api'
import { useSocialAvailable } from '../social/SocialContext'
import { useFriends } from '../social/friends'
import { gradeLabel } from '../social/profile'
import { useMyProfile } from '../social/useMyProfile'
import { Avatar } from './Avatar'
import { FriendsPanel } from './FriendsPanel'
import { Group, Row } from './Group'
import { ProfileForm } from './ProfileForm'
import { LoginForm } from './LoginForm'
import { Sheet } from './Sheet'

const rowBtn =
  'flex min-h-12 w-full items-center gap-2 px-4 text-left text-base text-ink transition hover:bg-paper'

/**
 * せっていのいちばん上の「プロフィール」のまとまり。
 * ログインの機能が使えないとき（公開キーが取れない）は、その旨だけ出す
 */
export function ProfileGroup() {
  const available = useSocialAvailable()
  return available ? <SignedProfileGroup /> : <OfflineProfileGroup />
}

function OfflineProfileGroup() {
  return (
    <Group label="プロフィール">
      <Row label="ログイン">
        <span className="pr-2 text-sm text-ink-muted">いまはつながらないよ</span>
      </Row>
    </Group>
  )
}

/** Clerk がこれだけたっても動き出さなければ、つながらないとみなす */
const LOAD_TIMEOUT_MS = 10_000

function SignedProfileGroup() {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMyProfile()
  const friends = useFriends(!!me.profile)
  const [loginOpen, setLoginOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  /** ログインした直後か。プロフィールがまだなければ、作るシートをそのまま開く */
  const [justSignedIn, setJustSignedIn] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const id = window.setTimeout(() => setGaveUp(true), LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [isLoaded])

  if (!isLoaded && gaveUp) return <OfflineProfileGroup />

  const sheetOpen =
    !!isSignedIn && (profileOpen || (justSignedIn && me.status === 'ready' && me.profile === null))
  const closeProfile = () => {
    setProfileOpen(false)
    setJustSignedIn(false)
  }

  let row
  if (!isSignedIn) {
    row = (
      <button
        type="button"
        onClick={() => setLoginOpen(true)}
        disabled={!isLoaded}
        className={`${rowBtn} disabled:text-ink-muted`}
      >
        <span className="min-w-0 flex-1">ログインする</span>
        {!isLoaded && <span className="text-sm text-ink-muted">つないでいるよ</span>}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
      </button>
    )
  } else if (me.status === 'error') {
    row = (
      <button type="button" onClick={() => void me.reload()} className={rowBtn}>
        <span className="min-w-0 flex-1">読み込めなかったよ</span>
        <span className="text-sm font-bold text-primary-ink">もう一度</span>
      </button>
    )
  } else if (me.status === 'loading') {
    row = (
      <Row label="プロフィール">
        <span className="pr-2 text-sm text-ink-muted">読み込んでいるよ</span>
      </Row>
    )
  } else if (!me.profile) {
    row = (
      <button type="button" onClick={() => setProfileOpen(true)} className={rowBtn}>
        <span className="min-w-0 flex-1">プロフィールを作る</span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
      </button>
    )
  } else {
    const sub = [gradeLabel(me.profile.grade), me.profile.bio].filter(Boolean).join(' ・ ')
    row = (
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        aria-label={`プロフィールを直す：${me.profile.nickname}`}
        className={`${rowBtn} gap-3 py-2`}
      >
        <Avatar icon={me.profile.icon} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{me.profile.nickname}</span>
          {sub && <span className="block truncate text-xs text-ink-muted">{sub}</span>}
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
      </button>
    )
  }

  return (
    <>
      <Group label="プロフィール">
        {row}
        {isSignedIn && me.profile && (
          <button type="button" onClick={() => setFriendsOpen(true)} className={rowBtn}>
            <span className="min-w-0 flex-1">フレンド</span>
            {friends.data && friends.data.incoming.length > 0 ? (
              <span className="text-sm font-bold text-ink">
                申請 {friends.data.incoming.length}
              </span>
            ) : (
              friends.data && (
                <span className="text-sm text-ink-muted">{friends.data.friends.length}人</span>
              )
            )}
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
          </button>
        )}
      </Group>
      <Sheet
        open={friendsOpen && !!isSignedIn && !!me.profile}
        title="フレンド"
        onClose={() => setFriendsOpen(false)}
      >
        <FriendsPanel data={friends.data} act={friends.act} reload={friends.load} />
      </Sheet>
      <Sheet open={loginOpen && !isSignedIn} title="ログイン" onClose={() => setLoginOpen(false)}>
        <LoginForm
          onDone={() => {
            setLoginOpen(false)
            setJustSignedIn(true)
          }}
        />
      </Sheet>
      <Sheet
        open={sheetOpen}
        title={me.profile ? 'プロフィール' : 'プロフィールを作る'}
        onClose={closeProfile}
      >
        <ProfileForm current={me.profile} onSave={me.save} onDone={closeProfile} />
      </Sheet>
    </>
  )
}

/** せっていの下のほうの「アカウント」のまとまり（ログインしているときだけ） */
export function AccountGroup() {
  const available = useSocialAvailable()
  return available ? <SignedAccountGroup /> : null
}

type Open = 'signOut' | 'delete' | null

function SignedAccountGroup() {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState<Open>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setOpen(null)
    setError(null)
  }

  if (!isSignedIn) return null

  const deleteAccount = async () => {
    setBusy(true)
    setError(null)
    const r = await authedCall(() => getToken(), 'DELETE', '/api/account')
    if (!r.ok) {
      setBusy(false)
      return setError('うまく消せなかったよ。電波のいいところで、もう一度試してね。')
    }
    await signOut()
    setBusy(false)
    close()
  }

  return (
    <>
      <Group label="アカウント">
        <Row label="メールアドレス">
          <span className="truncate pr-2 text-sm text-ink-muted">
            {user?.primaryEmailAddress?.emailAddress ?? ''}
          </span>
        </Row>
        <button type="button" onClick={() => setOpen('signOut')} className={rowBtn}>
          ログアウト
        </button>
        <button
          type="button"
          onClick={() => setOpen('delete')}
          className={`${rowBtn} text-danger hover:bg-danger-soft`}
        >
          退会する
        </button>
      </Group>

      <Sheet open={open === 'signOut'} title="ログアウトする？" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            課題はこの端末に残るよ。フレンドの機能は、またログインすると使えるよ。
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              close()
            }}
            className="min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong"
          >
            ログアウト
          </button>
          <button type="button" onClick={close} className={cancelBtn}>
            やめる
          </button>
        </div>
      </Sheet>

      <Sheet open={open === 'delete'} title="退会する？" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            プロフィールとフレンドが消えて、もとに戻せないよ。課題はこの端末に残るよ。
          </p>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={deleteAccount}
            disabled={busy}
            className="min-h-12 rounded-full bg-danger text-base font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            退会する
          </button>
          <button type="button" onClick={close} className={cancelBtn}>
            やめる
          </button>
        </div>
      </Sheet>
    </>
  )
}

const cancelBtn =
  'min-h-12 rounded-full border border-line bg-surface text-base font-bold text-ink transition hover:bg-paper'
