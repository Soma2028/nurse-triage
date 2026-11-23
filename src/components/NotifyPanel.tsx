import { Bell, BellRing, Send, Share, SquarePlus } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { disableNotifications, enableNotifications, sendTestNotification } from '../sync/notify'
import { setPushState, usePushState, type NotifyPrefs } from '../sync/pushState'
import { currentEnv, detectSupport, isIOS } from '../sync/support'

type Busy = 'enable' | 'disable' | 'test' | null
type Message = { tone: 'info' | 'error'; text: string } | null

const readPermission = (): NotificationPermission =>
  'Notification' in window ? Notification.permission : 'default'

/** 設定アプリなどで許可を変えて戻ってきたときに、表示を更新する */
function usePermission(): [NotificationPermission, () => void] {
  const [permission, setPermission] = useState(readPermission)
  useEffect(() => {
    const onVisible = () =>
      document.visibilityState === 'visible' && setPermission(readPermission())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  return [permission, () => setPermission(readPermission())]
}

const TIMINGS: { key: keyof Omit<NotifyPrefs, 'showTitle'>; label: string; hint?: string }[] = [
  { key: 'eve', label: '締切の前の日 20:00' },
  { key: 'h3', label: '締切の3時間前' },
  { key: 'morning', label: '朝 7:00 のまとめ', hint: '赤の課題がある日だけ' },
]

function Check({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0 size-5 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block">{children}</span>
        {hint && <span className="mt-1 block text-sm text-ink-muted">{hint}</span>}
      </span>
    </label>
  )
}

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-on-primary shadow-sm transition hover:bg-primary-strong disabled:opacity-60'
const softBtn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary disabled:opacity-60'

/** せっていの「通知」シートの中身。端末の状態に合わせて表示を変える */
export function NotifyPanel() {
  const push = usePushState()
  const [permission, refreshPermission] = usePermission()
  const [busy, setBusy] = useState<Busy>(null)
  const [message, setMessage] = useState<Message>(null)
  const env = useMemo(() => currentEnv(), [])
  const support = detectSupport(env)
  const ios = isIOS(env)

  const enable = async () => {
    setBusy('enable')
    setMessage(null)
    // タップの処理の中で、ほかの await より先に許可を聞く（enableNotifications の最初で聞いている）
    const result = await enableNotifications()
    refreshPermission()
    setBusy(null)
    if (result === 'ok') setMessage({ tone: 'info', text: '通知をオンにしたよ' })
    else if (result === 'failed')
      setMessage({
        tone: 'error',
        text: 'うまく登録できなかったよ。電波のいいところで、もう一度試してね',
      })
    else if (readPermission() === 'default')
      setMessage({ tone: 'error', text: '許可されなかったよ。もう一度押すと聞き直すよ' })
  }

  const disable = async () => {
    setBusy('disable')
    setMessage(null)
    await disableNotifications()
    setBusy(null)
    setMessage({ tone: 'info', text: '通知をやめたよ。サーバーにあったこの端末のデータも消したよ' })
  }

  const test = async () => {
    setBusy('test')
    setMessage(null)
    const result = await sendTestNotification()
    setBusy(null)
    setMessage(
      result === 'sent'
        ? { tone: 'info', text: '送ったよ。数秒で届くはず' }
        : result === 'none'
          ? {
              tone: 'error',
              text: '送り先が見つからなかったよ。「通知をやめる」を押してから、もう一度オンにしてね',
            }
          : { tone: 'error', text: '送れなかったよ。時間をおいて、もう一度試してね' },
    )
  }

  const setPref = (key: keyof NotifyPrefs, value: boolean) =>
    setPushState({ prefs: { ...push.prefs, [key]: value } })

  /** 表示中の状態の名前（確認用に data-state へ出す） */
  const stateName =
    support !== 'ok'
      ? support
      : permission === 'denied'
        ? 'denied'
        : push.enabled
          ? 'enabled'
          : 'off'

  let body: ReactNode
  if (support === 'ios-browser') {
    body = (
      <>
        <p className="mt-1">ホーム画面に追加すると、締切が近い課題を通知で知らせられるよ。</p>
        <ol className="mt-3 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Step n={1} />
            <span>
              Safari の共有ボタン
              <Share aria-label="共有" className="mx-1 inline size-4 align-[-2px]" />
              をタップ（見当たらなければ「…」の中）
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Step n={2} />
            <span>
              <SquarePlus aria-hidden className="mr-1 inline size-4 align-[-2px]" />
              「ホーム画面に追加」を選ぶ
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Step n={3} />
            <span>ホーム画面のアイコンから開いて、ここで「通知を受け取る」を押す</span>
          </li>
        </ol>
      </>
    )
  } else if (support === 'unsupported') {
    body = (
      <p className="mt-1 text-sm text-ink-muted">
        この端末・ブラウザでは通知を受け取れないみたい。iPhone は iOS 16.4
        以降で、ホーム画面に追加して開くと使えるよ。
      </p>
    )
  } else if (permission === 'denied') {
    body = (
      <p className="mt-1">
        通知が許可されていないよ。
        {ios
          ? '設定アプリ → 通知 → 看護トリアージ から許可してね。'
          : 'ブラウザのサイトの設定から、通知を許可してね。'}
      </p>
    )
  } else if (!push.enabled) {
    body = (
      <>
        {push.lost && (
          <p className="mt-1 rounded-2xl bg-danger-soft px-3 py-2 text-sm text-danger">
            通知の登録が切れていたよ。もう一度オンにしてね。
          </p>
        )}
        <p className="mt-1">締切の前の日の夜や3時間前に、通知で知らせるよ。</p>
        <p className="mt-1 text-sm text-ink-muted">
          サーバーに送るのは、締切・種類・完了したかだけ。課題名は送らないよ。
        </p>
        <button
          type="button"
          onClick={enable}
          disabled={busy !== null}
          className={`${primaryBtn} mt-3 w-full`}
        >
          <Bell aria-hidden className="size-5" />
          {busy === 'enable' ? '準備しているよ…' : '通知を受け取る'}
        </button>
      </>
    )
  } else {
    body = (
      <>
        <p className="mt-1 flex items-center gap-2 font-bold">
          <BellRing aria-hidden className="size-5 text-primary-ink" />
          通知はオン
        </p>
        <fieldset className="mt-2">
          <legend className="text-sm text-ink-muted">知らせるタイミング</legend>
          <div className="divide-y divide-line">
            {TIMINGS.map((t) => (
              <Check
                key={t.key}
                checked={push.prefs[t.key]}
                onChange={(v) => setPref(t.key, v)}
                hint={t.hint}
              >
                {t.label}
              </Check>
            ))}
          </div>
        </fieldset>
        <div className="mt-2 border-t border-line pt-1">
          <Check
            checked={push.prefs.showTitle}
            onChange={(v) => setPref('showTitle', v)}
            hint="患者さんの情報（イニシャル・病名など）を課題名に入れているなら、オフのままにしてね。オフのときは「実習記録」のように種類で知らせるよ"
          >
            通知に課題名を出す
          </Check>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={test} disabled={busy !== null} className={softBtn}>
            <Send aria-hidden className="size-4" />
            {busy === 'test' ? '送っているよ…' : 'テスト通知を送る'}
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy !== null}
            className="min-h-11 rounded-full px-4 text-sm font-bold text-danger transition hover:bg-danger-soft disabled:opacity-60"
          >
            {busy === 'disable' ? 'やめているよ…' : '通知をやめる'}
          </button>
        </div>
      </>
    )
  }

  return (
    <section aria-label="通知" data-state={stateName} className="flex flex-col">
      {body}
      <p
        aria-live="polite"
        className={`text-sm empty:hidden ${message ? 'mt-3' : ''} ${
          message?.tone === 'error' ? 'text-danger' : 'text-ink-muted'
        }`}
      >
        {message?.text}
      </p>
    </section>
  )
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink"
    >
      {n}
    </span>
  )
}
