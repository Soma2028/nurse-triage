import { ChevronLeft, ChevronRight, Copy, QrCode as QrIcon, Share2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { ActResult, FriendAction, FriendState, Person } from '../social/friends'
import { gradeLabel } from '../social/profile'
import { inviteLink } from '../social/invite'
import { progressText } from '../social/progress'
import { markCheersSeen } from '../social/cheersSeen'
import { MAX_CHEERS_PER_DAY, STAMP_KEYS, STAMPS, cheerTime } from '../social/stamps'
import { dayKey } from '../logic/schedule'
import { Avatar } from './Avatar'
import { Group, SwitchRow } from './Group'
import { QrCode } from './QrCode'

/** 人の一覧のどこにいる人か */
type Kind = 'friend' | 'incoming' | 'outgoing' | 'blocked'

type Message = { tone: 'info' | 'error'; text: string } | null

const RESULT_TEXT: Record<string, string> = {
  cheered: '応援を送ったよ。',
  requested: '申請したよ。相手が承認するとフレンドになるよ。',
  friends: 'フレンドになったよ。',
  declined: '申請を断ったよ。',
  canceled: '申請を取り消したよ。',
  removed: 'フレンドをやめたよ。',
  blocked: 'ブロックしたよ。',
  unblocked: 'ブロックを外したよ。',
  regenerated: '新しいコードにしたよ。前のコードはもう使えないよ。',
}

const ERROR_TEXT: Record<string, string> = {
  cheer_limit: `同じ人への応援は、1日${MAX_CHEERS_PER_DAY}回までだよ。`,
  not_found: 'そのコードの人が見つからなかったよ。コードを確かめてね。',
  self: 'それは自分のコードだよ。',
  already_friends: 'もうフレンドだよ。',
  blocked: 'ブロックしている人だよ。先にブロックを外してね。',
  limit: 'フレンドは100人までだよ。',
  no_profile: '先にプロフィールを作ってね。',
  'invalid input': 'コードは8文字だよ。',
}
const NETWORK_ERROR = 'うまくいかなかったよ。電波のいいところで、もう一度試してね。'

const note = 'px-4 text-xs leading-5 text-ink-muted'
const rowBtn =
  'flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left text-base text-ink transition hover:bg-paper'
const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60'
const plainBtn =
  'min-h-12 rounded-full border border-line bg-surface text-base font-bold text-ink transition hover:bg-paper disabled:opacity-60'
const dangerTextBtn =
  'min-h-11 rounded-full px-4 text-sm font-bold text-danger transition hover:bg-danger-soft disabled:opacity-60'

const personSub = (p: Person) => [gradeLabel(p.grade), p.bio].filter(Boolean).join(' ・ ')

/** 一覧の1人（押すとくわしい画面） */
function PersonRow({
  person,
  today,
  onOpen,
  aside,
}: {
  person: Person
  /** 今日の日付 YYYY-MM-DD（進み具合が今日の分か見分ける） */
  today: string
  onOpen: () => void
  aside?: ReactNode
}) {
  // フレンドは今日の進み具合を、それ以外の人は学年・ひとことを出す
  const sub = progressText(person.progress, today) ?? personSub(person)
  return (
    <div className="flex items-center">
      <button type="button" onClick={onOpen} className={`${rowBtn} min-w-0 flex-1`}>
        <Avatar icon={person.icon} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{person.nickname}</span>
          {sub && <span className="block truncate text-xs text-ink-muted">{sub}</span>}
        </span>
        {!aside && <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />}
      </button>
      {aside && <div className="shrink-0 pr-2">{aside}</div>}
    </div>
  )
}

/**
 * せっていの「フレンド」のシートの中身：一覧 → 押すと1人のくわしい画面。
 * data は useFriends から、act で申請などをする
 */
export function FriendsPanel({
  data,
  error,
  act,
  reload,
  shareProgress,
  onShareProgress,
}: {
  data: FriendState | null
  /** 読み込みに失敗した理由（なければ null） */
  error: string | null
  act: (a: FriendAction) => Promise<ActResult>
  reload: () => Promise<void>
  /** 今日の進み具合をフレンドに見せているか */
  shareProgress: boolean
  onShareProgress: (share: boolean) => Promise<boolean>
}) {
  const [detail, setDetail] = useState<{ person: Person; kind: Kind } | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [showQr, setShowQr] = useState(false)
  // 今日の日付（シートを開いたときの。進み具合が今日の分か見分ける）
  const [openedAt] = useState(() => Date.now())
  const today = dayKey(openedAt)
  /** 見せるスイッチを押したあと、サーバーが返事をするまでの値（押した瞬間に切り替えて見せる） */
  const [sharePending, setSharePending] = useState<boolean | null>(null)

  const toggleShare = async () => {
    if (sharePending !== null) return
    const next = !shareProgress
    setSharePending(next)
    setMessage(null)
    const ok = await onShareProgress(next)
    setSharePending(null)
    if (!ok) setMessage({ tone: 'error', text: NETWORK_ERROR })
  }

  // 届いた応援を見たことにする（せっていの「フレンド」の行の数を消す）
  const latestCheer = data?.cheers[0]?.createdAt ?? 0
  useEffect(() => {
    if (latestCheer) markCheersSeen(latestCheer)
  }, [latestCheer])

  // 開いたら最新にする（申請が届いているかもしれない）
  useEffect(() => {
    void reload()
  }, [reload])

  const run = async (a: FriendAction): Promise<boolean> => {
    setBusy(true)
    setMessage(null)
    const r = await act(a)
    setBusy(false)
    if (r.error) {
      setMessage({ tone: 'error', text: ERROR_TEXT[r.error] ?? NETWORK_ERROR })
      return false
    }
    setMessage({ tone: 'info', text: RESULT_TEXT[r.result ?? ''] ?? '' })
    return true
  }

  if (!data) {
    if (!error) return <p className="text-sm text-ink-muted">読み込んでいるよ</p>
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-6 text-ink">
          {error === 'no_profile'
            ? '先にプロフィールを作ってね。'
            : `フレンドを読み込めなかったよ（${error}）。電波のいいところで、もう一度試してね。`}
        </p>
        <button type="button" onClick={() => void reload()} className={plainBtn}>
          もう一度
        </button>
      </div>
    )
  }

  if (detail) {
    return (
      <PersonDetail
        person={detail.person}
        kind={detail.kind}
        today={today}
        busy={busy}
        onBack={() => setDetail(null)}
        onAction={async (a) => {
          if (await run(a)) setDetail(null)
        }}
      />
    )
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    if (await run({ action: 'request', code })) setCode('')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.friendCode)
      setMessage({ tone: 'info', text: 'コードをコピーしたよ。' })
    } catch {
      setMessage({ tone: 'error', text: 'コピーできなかったよ。コードを長押しして選んでね。' })
    }
  }

  const link = inviteLink(data.friendCode)

  /** 招待リンクを送る。共有の画面が使えなければ、リンクをコピーする */
  const share = async () => {
    const shareData = {
      title: '看護トリアージ',
      text: '看護トリアージでフレンドになろう',
      url: link,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // 送るのをやめた
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setMessage({ tone: 'info', text: 'リンクをコピーしたよ。LINE などに貼って送ってね。' })
    } catch {
      setMessage({ tone: 'error', text: 'リンクを送れなかったよ。コードを教えてね。' })
    }
  }

  const open = (person: Person, kind: Kind) => () => {
    setMessage(null)
    setDetail({ person, kind })
  }

  return (
    <div className="flex flex-col gap-6">
      {message?.text && (
        <p
          aria-live="polite"
          className={`px-4 text-sm ${message.tone === 'error' ? 'font-bold text-danger' : 'text-ink-muted'}`}
        >
          {message.text}
        </p>
      )}

      {data.cheers.length > 0 && (
        <Group label="届いた応援">
          {data.cheers.slice(0, 10).map((c) => {
            const { Icon, label: stampLabel } = STAMPS[c.stamp]
            return (
              <div key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <Avatar icon={c.from.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ink">
                    {c.from.nickname}さん「{stampLabel}」
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {cheerTime(c.createdAt, openedAt)}
                  </span>
                </span>
                <Icon aria-hidden className="size-5 shrink-0 text-primary-ink" />
              </div>
            )
          })}
        </Group>
      )}

      {data.incoming.length > 0 && (
        <Group label="届いた申請">
          {data.incoming.map((p) => (
            <PersonRow
              key={p.userId}
              person={p}
              today={today}
              onOpen={open(p, 'incoming')}
              aside={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run({ action: 'accept', userId: p.userId })}
                  className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60"
                >
                  承認
                </button>
              }
            />
          ))}
        </Group>
      )}

      <section className="flex flex-col gap-2">
        <Group label={`フレンド ${data.friends.length}人`}>
          {data.friends.length === 0 ? (
            <p className="px-4 py-3 text-sm leading-6 text-ink">
              まだフレンドはいないよ。コードを教え合おう。
            </p>
          ) : (
            data.friends.map((p) => (
              <PersonRow key={p.userId} person={p} today={today} onOpen={open(p, 'friend')} />
            ))
          )}
        </Group>
      </section>

      {data.outgoing.length > 0 && (
        <Group label="送った申請">
          {data.outgoing.map((p) => (
            <PersonRow key={p.userId} person={p} today={today} onOpen={open(p, 'outgoing')} />
          ))}
        </Group>
      )}

      <section className="flex flex-col gap-2">
        <Group label="フレンドを追加">
          <form onSubmit={submitCode} noValidate className="flex items-center gap-2 pr-2">
            <input
              aria-label="フレンドのコード"
              className="min-h-12 w-full min-w-0 flex-1 bg-transparent pl-4 text-base tracking-widest text-ink uppercase placeholder:tracking-normal placeholder:text-ink-muted placeholder:normal-case focus:outline-none"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="相手のコード（8文字）"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
            />
            <button
              type="submit"
              disabled={busy || code.trim() === ''}
              className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60"
            >
              申請する
            </button>
          </form>
        </Group>
      </section>

      <section className="flex flex-col gap-2">
        <Group label="自分のコード">
          <div className="flex min-h-14 items-center gap-2 pr-2 pl-4">
            <span className="min-w-0 flex-1 text-title font-bold tracking-widest text-ink tabular-nums select-text">
              {data.friendCode}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary"
            >
              <Copy aria-hidden className="size-4" />
              コピー
            </button>
          </div>
        </Group>
        <p className={note}>このコードを教えると、相手から申請できるよ。</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary"
          >
            <Share2 aria-hidden className="size-4" />
            リンクを送る
          </button>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary"
          >
            <QrIcon aria-hidden className="size-4" />
            {showQr ? 'QR をしまう' : 'QR を出す'}
          </button>
        </div>
        {showQr && (
          <div className="ui-card flex flex-col items-center gap-2 rounded-2xl p-4">
            <QrCode text={link} label="自分の招待リンクの QR コード" />
            <p className="text-center text-xs leading-5 text-ink-muted">
              相手の iPhone のカメラで読み取ってもらってね。
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => run({ action: 'regenerateCode' })}
          className="self-start rounded-full px-4 py-2 text-sm font-bold text-primary-ink transition hover:bg-primary-soft disabled:opacity-60"
        >
          コードを作り直す
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <Group label="今日の進み具合">
          <SwitchRow
            label="フレンドに見せる"
            on={sharePending ?? shareProgress}
            onToggle={toggleShare}
          />
        </Group>
        <p className={note}>見せるのは、今日完了した数と赤の数だけ。課題名は見せないよ。</p>
      </section>

      {data.blocked.length > 0 && (
        <Group label="ブロックした人">
          {data.blocked.map((p) => (
            <PersonRow key={p.userId} person={p} today={today} onOpen={open(p, 'blocked')} />
          ))}
        </Group>
      )}
    </div>
  )
}

/** 1人のくわしい画面と、その人への操作。フレンドをやめる・ブロックは、もう一度たずねる */
function PersonDetail({
  person,
  kind,
  today,
  busy,
  onBack,
  onAction,
}: {
  person: Person
  kind: Kind
  today: string
  busy: boolean
  onBack: () => void
  onAction: (a: FriendAction) => void
}) {
  const [confirm, setConfirm] = useState<'remove' | 'block' | null>(null)
  const id = person.userId
  const sub = personSub(person)
  const progress = progressText(person.progress, today)

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full pr-4 pl-2 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
      >
        <ChevronLeft aria-hidden className="size-4" />
        もどる
      </button>

      <div className="flex items-center gap-4 px-4">
        <Avatar icon={person.icon} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink">{person.nickname}</p>
          {sub && <p className="text-sm text-ink-muted">{sub}</p>}
          {progress && <p className="text-sm text-ink">{progress}</p>}
        </div>
      </div>

      {confirm ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            {confirm === 'remove'
              ? `${person.nickname}さんとのフレンドをやめる？相手には知らせないよ。`
              : `${person.nickname}さんをブロックする？フレンドと申請が消えて、この人から申請や応援が届かなくなるよ。相手には知らせないよ。`}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction({ action: confirm, userId: id })}
            className="min-h-12 rounded-full bg-danger text-base font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {confirm === 'remove' ? 'フレンドをやめる' : 'ブロックする'}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className={plainBtn}>
            やめる
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {kind === 'incoming' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction({ action: 'accept', userId: id })}
                className={primaryBtn}
              >
                承認する
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction({ action: 'decline', userId: id })}
                className={plainBtn}
              >
                断る
              </button>
            </>
          )}
          {kind === 'outgoing' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction({ action: 'cancel', userId: id })}
              className={plainBtn}
            >
              申請を取り消す
            </button>
          )}
          {kind === 'friend' && (
            <section className="flex flex-col gap-2">
              <h3 className="px-4 text-xs font-bold tracking-wide text-ink-muted">応援する</h3>
              <div className="grid grid-cols-2 gap-2">
                {STAMP_KEYS.map((key) => {
                  const { Icon, label: stampLabel } = STAMPS[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={busy}
                      onClick={() => onAction({ action: 'cheer', userId: id, stamp: key })}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-soft px-3 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary disabled:opacity-60"
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {stampLabel}
                    </button>
                  )
                })}
              </div>
              <p className="px-4 text-xs leading-5 text-ink-muted">
                {`同じ人には1日${MAX_CHEERS_PER_DAY}回まで送れるよ。`}
              </p>
            </section>
          )}
          {kind === 'friend' && (
            <button type="button" onClick={() => setConfirm('remove')} className={plainBtn}>
              フレンドをやめる
            </button>
          )}
          {kind === 'blocked' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction({ action: 'unblock', userId: id })}
              className={plainBtn}
            >
              ブロックを外す
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm('block')}
              className={`${dangerTextBtn} self-center`}
            >
              ブロックする
            </button>
          )}
        </div>
      )}
    </div>
  )
}
