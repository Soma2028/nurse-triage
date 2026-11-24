import { Bell, BellRing, Send, Share, SquarePlus } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { disableNotifications, enableNotifications, sendTestNotification } from '../sync/notify'
import {
  H3_LEADS,
  TIME_STEP,
  setPushState,
  usePushState,
  type NotifyPrefs,
} from '../sync/pushState'
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

type Choice = { value: number; label: string }

const clock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
/** 0:00〜23:45 の15分刻み */
const TIMES: Choice[] = Array.from({ length: (24 * 60) / TIME_STEP }, (_, i) => ({
  value: i * TIME_STEP,
  label: clock(i * TIME_STEP),
}))
const LEADS: Choice[] = H3_LEADS.map((m) => ({
  value: m,
  label: m < 60 ? `${m}分前` : `${m / 60}時間前`,
}))

type OnOffKey = 'eve' | 'h3' | 'morning'
type ValueKey = 'eveTime' | 'h3Lead' | 'morningTime'

const TIMINGS: {
  key: OnOffKey
  valueKey: ValueKey
  label: string
  choices: Choice[]
  hint?: string
}[] = [
  { key: 'eve', valueKey: 'eveTime', label: '締切の前の日', choices: TIMES },
  { key: 'h3', valueKey: 'h3Lead', label: '締切の少し前', choices: LEADS },
  {
    key: 'morning',
    valueKey: 'morningTime',
    label: '赤の課題のまとめ',
    choices: TIMES,
    hint: '赤の課題がある日だけ、毎日届くよ。',
  },
]

function Check({
  checked,
  onChange,
  children,
  hint,
  aside,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  hint?: ReactNode
  /** 右に置くもの（時刻を選ぶ欄）。label の外に置き、押してもチェックが切り替わらないようにする */
  aside?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 py-3">
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
      {aside && <div className="shrink-0 py-2">{aside}</div>}
    </div>
  )
}

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-on-primary shadow-sm transition hover:bg-primary-strong disabled:opacity-60'
const softBtn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary disabled:opacity-60'

/* 文章の書き方は Help.tsx と同じ：1文に1つのこと、カッコ書きの補足を使わない、本文は濃い文字 */
const text = 'text-sm leading-6 text-ink'
const note = 'text-xs leading-5 text-ink-muted'
const label = 'text-xs font-bold tracking-wide text-ink-muted'

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
    if (result === 'ok') setMessage({ tone: 'info', text: '通知をオンにしたよ。' })
    else if (result === 'failed')
      setMessage({
        tone: 'error',
        text: 'うまく登録できなかったよ。電波のいいところで、もう一度試してね。',
      })
    else if (readPermission() === 'default')
      setMessage({ tone: 'error', text: '許可されなかったよ。もう一度押すと、また聞くよ。' })
  }

  const disable = async () => {
    setBusy('disable')
    setMessage(null)
    await disableNotifications()
    setBusy(null)
    setMessage({ tone: 'info', text: '通知をやめたよ。サーバーにあったデータも消したよ。' })
  }

  const test = async () => {
    setBusy('test')
    setMessage(null)
    const result = await sendTestNotification()
    setBusy(null)
    setMessage(
      result === 'sent'
        ? { tone: 'info', text: '送ったよ。数秒で届くはず。' }
        : result === 'none'
          ? {
              tone: 'error',
              text: '送り先が見つからなかったよ。一度「通知をやめる」を押して、もう一度オンにしてね。',
            }
          : { tone: 'error', text: '送れなかったよ。少し時間をおいて、もう一度試してね。' },
    )
  }

  const setPref = <K extends keyof NotifyPrefs>(key: K, value: NotifyPrefs[K]) =>
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
        <p className={text}>ホーム画面に追加すると、通知を受け取れるよ。</p>
        <ol className="flex flex-col gap-4">
          <li className="flex items-start gap-3">
            <Step n={1} />
            <span className={text}>
              Safari の共有ボタン
              <Share aria-label="共有" className="mx-1 inline size-4 align-[-2px]" />
              を押す
              <span className="block text-xs text-ink-muted">
                見当たらないときは「…」の中にあるよ。
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={2} />
            <span className={text}>
              <SquarePlus aria-hidden className="mr-1 inline size-4 align-[-2px]" />
              「ホーム画面に追加」を選ぶ
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={3} />
            <span className={text}>ホーム画面のアイコンから開き直す</span>
          </li>
        </ol>
      </>
    )
  } else if (support === 'unsupported') {
    body = (
      <>
        <p className={text}>この端末では、通知を受け取れないみたい。</p>
        <p className={note}>iPhone なら、iOS 16.4 以降でホーム画面に追加すると使えるよ。</p>
      </>
    )
  } else if (permission === 'denied') {
    body = (
      <>
        <p className={text}>通知が許可されていないよ。</p>
        <p className={text}>
          {ios
            ? '設定アプリ → 通知 → 看護トリアージ で、通知を許可してね。'
            : 'ブラウザのサイトの設定で、通知を許可してね。'}
        </p>
      </>
    )
  } else if (!push.enabled) {
    body = (
      <>
        {push.lost && (
          <p className="rounded-2xl border border-line bg-surface px-4 py-2 text-sm text-ink">
            通知の登録が切れていたよ。もう一度オンにしてね。
          </p>
        )}
        <p className={text}>締切の前の日と、締切の少し前に知らせるよ。</p>
        <p className={note}>サーバーに送るのは締切と種類だけ。課題名は送らないよ。</p>
        <button
          type="button"
          onClick={enable}
          disabled={busy !== null}
          className={`${primaryBtn} w-full`}
        >
          <Bell aria-hidden className="size-5" />
          {busy === 'enable' ? '準備しているよ…' : '通知を受け取る'}
        </button>
      </>
    )
  } else {
    body = (
      <>
        <p className="flex items-center gap-2 text-base font-bold">
          <BellRing aria-hidden className="size-5 text-primary-ink" />
          通知はオン
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className={`${label} mb-2`}>知らせるタイミング</legend>
          <div className="ui-card divide-y divide-line rounded-2xl px-4">
            {TIMINGS.map((t) => (
              <Check
                key={t.key}
                checked={push.prefs[t.key]}
                onChange={(v) => setPref(t.key, v)}
                hint={t.hint}
                aside={
                  <select
                    aria-label={`${t.label}の時刻`}
                    value={push.prefs[t.valueKey]}
                    onChange={(e) => setPref(t.valueKey, Number(e.target.value))}
                    disabled={!push.prefs[t.key]}
                    className="ui-input mt-0 w-auto disabled:opacity-60"
                  >
                    {t.choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                }
              >
                {t.label}
              </Check>
            ))}
          </div>
        </fieldset>
        <section className="flex flex-col gap-2">
          <h3 className={label}>課題名</h3>
          <div className="ui-card rounded-2xl px-4">
            <Check
              checked={push.prefs.showTitle}
              onChange={(v) => setPref('showTitle', v)}
              hint={
                <>
                  オフのときは「実習記録」のように、種類で知らせるよ。
                  <br />
                  課題名に患者さんのイニシャルや病名を入れているなら、オフのままにしてね。
                </>
              }
            >
              通知に課題名を出す
            </Check>
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-2">
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
    <section aria-label="通知" data-state={stateName} className="flex flex-col gap-4">
      {body}
      <p
        aria-live="polite"
        className={`text-sm empty:hidden ${
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
