import { useAuth, useClerk, useUser } from '@clerk/react'
import { ChevronRight, LogIn, Mail, UserRound, Users } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { authedCall } from '../social/api'
import { useSocialAvailable } from '../social/SocialContext'
import { useCheersSeen } from '../social/cheersSeen'
import { useFriends } from '../social/friends'
import { gradeLabel, type ProfileInput } from '../social/profile'
import { saveLocalProfile, useLocalProfile } from '../social/localProfile'
import { useMyProfile } from '../social/useMyProfile'
import { Avatar } from './Avatar'
import { forgetDeviceLink, unlinkThisDevice } from '../social/deviceLink'
import { FriendsPanel } from './FriendsPanel'
import { Group, LinkRow, Row } from './Group'
import { ProfileForm } from './ProfileForm'
import { LoginForm } from './LoginForm'
import { Sheet } from './Sheet'

const rowBtn =
  'flex min-h-12 w-full items-center gap-3 px-4 text-left text-base text-ink transition hover:bg-paper'

/** プロフィールの1行（アイコン・ニックネーム・学年とひとこと）。なければ「プロフィールを作る」 */
function ProfileRow({ profile, onClick }: { profile: ProfileInput | null; onClick: () => void }) {
  if (!profile) {
    return <LinkRow icon={UserRound} label="プロフィールを作る" onClick={onClick} />
  }
  const sub = [gradeLabel(profile.grade), profile.bio].filter(Boolean).join(' ・ ')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`プロフィールを直す：${profile.nickname}`}
      className={`${rowBtn} py-3`}
    >
      <Avatar icon={profile.icon} photo={profile.photo} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{profile.nickname}</span>
        {sub && <span className="block truncate text-xs text-ink-muted">{sub}</span>}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </button>
  )
}

/** サーバーのプロフィールから、端末に置く分（フレンドコードなどを除く）を取り出す */
const toInput = (p: ProfileInput): ProfileInput => ({
  nickname: p.nickname,
  icon: p.icon,
  grade: p.grade,
  bio: p.bio,
  photo: p.photo ?? null,
})

/**
 * せっていのいちばん上の「プロフィール」のまとまり。
 * ログインしていなくても、端末の中だけのプロフィールを作って直せる（フレンドには見えない）
 */
export function ProfileGroup({ onOpenFriends }: { onOpenFriends: () => void }) {
  const available = useSocialAvailable()
  return available ? (
    <SignedProfileGroup onOpenFriends={onOpenFriends} />
  ) : (
    <LocalProfileGroup loginRow={<OfflineLoginRow />} />
  )
}

/** ログインできないとき（サーバーにつながらない）の行 */
function OfflineLoginRow() {
  return (
    <LinkRow icon={LogIn} label="ログイン" value="いまはつながらないよ" disabled chevron={false} />
  )
}

/** ログインしていないとき：端末の中のプロフィールと、ログインの行 */
function LocalProfileGroup({ loginRow }: { loginRow: ReactNode }) {
  const local = useLocalProfile()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Group>
        <ProfileRow profile={local} onClick={() => setOpen(true)} />
      </Group>
      <Group>{loginRow}</Group>
      <Sheet
        open={open}
        title={local ? 'プロフィール' : 'プロフィールを作る'}
        onClose={() => setOpen(false)}
      >
        <ProfileForm
          current={local}
          onSave={async (p) => {
            saveLocalProfile(toInput(p))
            return 'ok'
          }}
          onDone={() => setOpen(false)}
        />
      </Sheet>
    </>
  )
}

/** Clerk がこれだけたっても動き出さなければ、つながらないとみなす */
const LOAD_TIMEOUT_MS = 10_000

function SignedProfileGroup({ onOpenFriends }: { onOpenFriends: () => void }) {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMyProfile()
  const local = useLocalProfile()
  const friends = useFriends(!!me.profile)
  const cheersSeen = useCheersSeen()
  const newCheers = friends.data?.cheers.filter((c) => c.createdAt > cheersSeen).length ?? 0
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  /** ログインした直後か。プロフィールがどこにもなければ、作るシートをそのまま開く */
  const [justSignedIn, setJustSignedIn] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  /** 端末のプロフィールをサーバーに上げたか（何度も上げないように） */
  const uploaded = useRef(false)

  useEffect(() => {
    if (isLoaded) return
    const id = window.setTimeout(() => setGaveUp(true), LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [isLoaded])

  // ログイン中：サーバーにプロフィールがなく、端末にあれば、それで作る。
  // サーバーにあれば、端末の分をサーバーの分にそろえる（ログアウトしても同じものが残るように）
  const { status, profile, save } = me
  useEffect(() => {
    if (!isSignedIn || status !== 'ready') return
    if (!profile) {
      if (local && !uploaded.current) {
        uploaded.current = true
        void save(toInput(local))
      }
      return
    }
    const next = toInput(profile)
    if (JSON.stringify(next) !== JSON.stringify(local)) saveLocalProfile(next)
  }, [isSignedIn, status, profile, local, save])

  if (!isSignedIn || (!isLoaded && gaveUp)) {
    const offline = !isLoaded && gaveUp
    return (
      <>
        <LocalProfileGroup
          loginRow={
            offline ? (
              <OfflineLoginRow />
            ) : (
              <LinkRow
                icon={LogIn}
                label="ログインしてフレンドとつながる"
                value={isLoaded ? undefined : 'つないでいるよ'}
                disabled={!isLoaded}
                onClick={() => setLoginOpen(true)}
              />
            )
          }
        />
        <Sheet open={loginOpen} title="ログイン" onClose={() => setLoginOpen(false)}>
          <LoginForm
            onDone={() => {
              setLoginOpen(false)
              setJustSignedIn(true)
            }}
          />
        </Sheet>
      </>
    )
  }

  const sheetOpen =
    profileOpen || (justSignedIn && status === 'ready' && profile === null && !local)
  const closeProfile = () => {
    setProfileOpen(false)
    setJustSignedIn(false)
  }

  const incoming = friends.data?.incoming.length ?? 0
  const friendsValue =
    incoming > 0
      ? `申請 ${incoming}`
      : newCheers > 0
        ? `応援 ${newCheers}`
        : friends.data
          ? `${friends.data.friends.length}人`
          : undefined

  let row
  if (status === 'error') {
    row = (
      <button type="button" onClick={() => void me.reload()} className={rowBtn}>
        <span className="min-w-0 flex-1">読み込めなかったよ</span>
        <span className="text-sm font-bold text-primary-ink">もう一度</span>
      </button>
    )
  } else if (status === 'loading' || (!profile && local)) {
    // 読み込み中・端末のプロフィールを上げている間は、端末の分を出しておく
    row = local ? (
      <ProfileRow profile={local} onClick={() => setProfileOpen(true)} />
    ) : (
      <Row label="プロフィール">
        <span className="pr-2 text-sm text-ink-muted">読み込んでいるよ</span>
      </Row>
    )
  } else {
    row = <ProfileRow profile={profile} onClick={() => setProfileOpen(true)} />
  }

  return (
    <>
      <Group>{row}</Group>
      {profile && (
        <Group>
          <LinkRow
            icon={Users}
            label="フレンド"
            value={friendsValue}
            strong={incoming > 0 || newCheers > 0}
            onClick={onOpenFriends}
          />
        </Group>
      )}
      <Sheet
        open={sheetOpen}
        title={profile ? 'プロフィール' : 'プロフィールを作る'}
        onClose={closeProfile}
      >
        <ProfileForm current={profile ?? local} onSave={save} onDone={closeProfile} />
      </Sheet>
    </>
  )
}

/** せっていのフレンドのページの中身。開くたびに一覧を読み直す */
export function FriendsPage({ onGone }: { onGone: () => void }) {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMyProfile()
  const friends = useFriends(!!me.profile)
  const profile = me.profile

  // ログアウトしたら、このページにはいられないので、せっていに戻る
  useEffect(() => {
    if (isLoaded && !isSignedIn) onGone()
  }, [isLoaded, isSignedIn, onGone])

  if (!profile) {
    return <p className="px-4 text-sm text-ink-muted">読み込んでいるよ</p>
  }
  return (
    <FriendsPanel
      data={friends.data}
      error={friends.error}
      act={friends.act}
      reload={friends.load}
      shareProgress={profile.shareProgress !== false}
      onShareProgress={me.setShare}
    />
  )
}

/** せっていに置く「アカウント」の行（ログインしているときだけ）。押すとアカウントのページ */
export function AccountRow({ onOpen }: { onOpen: () => void }) {
  const available = useSocialAvailable()
  return available ? <SignedAccountRow onOpen={onOpen} /> : null
}

function SignedAccountRow({ onOpen }: { onOpen: () => void }) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  if (!isSignedIn) return null
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  return <LinkRow icon={Mail} label="アカウント" value={email} onClick={onOpen} />
}

type Confirm = 'signOut' | 'delete' | null

const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong'
const dangerBtn =
  'min-h-12 rounded-full bg-danger text-base font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60'
const cancelBtn =
  'min-h-12 rounded-full border border-line bg-surface text-base font-bold text-ink transition hover:bg-paper'

/** せっていのアカウントのページ：メールアドレス・ログアウト・退会（どちらももう一度たずねる） */
export function AccountPage({ onGone }: { onGone: () => void }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setConfirm(null)
    setError(null)
  }

  // ログアウト・退会したら、せっていに戻る
  useEffect(() => {
    if (isLoaded && !isSignedIn) onGone()
  }, [isLoaded, isSignedIn, onGone])

  const email = user?.primaryEmailAddress?.emailAddress ?? ''

  const deleteAccount = async () => {
    setBusy(true)
    setError(null)
    const r = await authedCall(() => getToken(), 'DELETE', '/api/account')
    if (!r.ok) {
      setBusy(false)
      return setError('うまく消せなかったよ。電波のいいところで、もう一度試してね。')
    }
    forgetDeviceLink()
    saveLocalProfile(null) // 退会したら、端末に置いたプロフィールも消す
    await signOut()
    setBusy(false)
    close()
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Group>
          <Row label="メールアドレス">
            <span className="truncate pr-2 text-sm text-ink-muted">{email}</span>
          </Row>
        </Group>
        <Group>
          <LinkRow label="ログアウト" chevron={false} onClick={() => setConfirm('signOut')} />
          <LinkRow label="退会する" danger onClick={() => setConfirm('delete')} />
        </Group>
      </div>

      <Sheet open={confirm === 'signOut'} title="ログアウトする？" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            課題はこの端末に残るよ。フレンドの機能は、またログインすると使えるよ。
          </p>
          <button
            type="button"
            onClick={async () => {
              // この端末にもう応援の通知が届かないよう、先にログインを外す
              await unlinkThisDevice(() => getToken())
              await signOut()
              close()
            }}
            className={primaryBtn}
          >
            ログアウト
          </button>
          <button type="button" onClick={close} className={cancelBtn}>
            やめる
          </button>
        </div>
      </Sheet>

      <Sheet open={confirm === 'delete'} title="退会する？" onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            プロフィールとフレンドが消えて、もとに戻せないよ。課題はこの端末に残るよ。
          </p>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <button type="button" onClick={deleteAccount} disabled={busy} className={dangerBtn}>
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
