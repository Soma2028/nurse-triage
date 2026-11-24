import { BellRing, Share, SquarePlus, Type } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { disableNotifications, enableNotifications } from '../sync/notify'
import {
  H3_LEADS,
  TIME_STEP,
  setPushState,
  usePushState,
  type NotifyPrefs,
} from '../sync/pushState'
import { currentEnv, detectSupport, isIOS } from '../sync/support'
import { Group, Picker, Row, Switch, SwitchRow } from './Group'

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

const TIMINGS: { key: OnOffKey; valueKey: ValueKey; label: string; choices: Choice[] }[] = [
  { key: 'eve', valueKey: 'eveTime', label: '締切の前の日', choices: TIMES },
  { key: 'h3', valueKey: 'h3Lead', label: '締切の少し前', choices: LEADS },
  { key: 'morning', valueKey: 'morningTime', label: '赤の課題のまとめ', choices: TIMES },
]

/* 文章の書き方は Help.tsx と同じ：1文に1つのこと、カッコ書きの補足を使わない、本文は濃い文字 */
const text = 'text-sm leading-6 text-ink'
const note = 'px-4 text-xs leading-5 text-ink-muted'

/** せっていの「通知」シートの中身。端末の状態に合わせて表示を変える */
export function NotifyPanel() {
  const push = usePushState()
  const [permission, refreshPermission] = usePermission()
  /**
   * スイッチを押したあと、登録・解除が終わるまでの「押した側」の値。
   * 押した瞬間にスイッチを切り替え、登録は裏で進める。失敗したら null に戻して元の表示にする
   */
  const [pending, setPending] = useState<boolean | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const env = useMemo(() => currentEnv(), [])
  const support = detectSupport(env)
  const ios = isIOS(env)

  const enable = async () => {
    setPending(true)
    setMessage(null)
    // タップの処理の中で、ほかの await より先に許可を聞く（enableNotifications の最初で聞いている）
    const result = await enableNotifications()
    refreshPermission()
    setPending(null)
    if (result === 'failed')
      setMessage({
        tone: 'error',
        text: 'うまく登録できなかったよ。電波のいいところで、もう一度試してね。',
      })
    else if (result !== 'ok' && readPermission() === 'default')
      setMessage({ tone: 'error', text: '許可されなかったよ。もう一度押すと、また聞くよ。' })
  }

  const disable = async () => {
    setPending(false)
    setMessage(null)
    await disableNotifications()
    setPending(null)
  }

  /** 登録・解除の途中にもう一度押されても、終わるまでは受け付けない（見た目はそのまま） */
  const toggle = () => {
    if (pending !== null) return
    void (push.enabled ? disable() : enable())
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
        <p className="text-xs leading-5 text-ink-muted">
          iPhone なら、iOS 16.4 以降でホーム画面に追加すると使えるよ。
        </p>
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
  } else {
    const on = pending ?? push.enabled
    body = (
      <>
        {push.lost && !on && (
          <p className="rounded-2xl border border-line bg-surface px-4 py-2 text-sm text-ink">
            通知の登録が切れていたよ。もう一度オンにしてね。
          </p>
        )}
        <section className="flex flex-col gap-2">
          <Group>
            <SwitchRow icon={BellRing} label="通知" on={on} onToggle={toggle} />
          </Group>
          <p className={note}>
            {on
              ? 'オフにすると、サーバーにあるこの端末のデータも消すよ。'
              : 'サーバーに送るのは締切と種類だけ。課題名は送らないよ。'}
          </p>
        </section>

        {on && (
          <>
            <section className="flex flex-col gap-2">
              <Group label="知らせるタイミング">
                {TIMINGS.map((t) => (
                  <Row key={t.key} label={t.label}>
                    {push.prefs[t.key] && (
                      <Picker
                        self
                        text={
                          t.choices.find((c) => c.value === push.prefs[t.valueKey])?.label ?? ''
                        }
                      >
                        <select
                          aria-label={`${t.label}の時刻`}
                          className="ui-picker"
                          value={push.prefs[t.valueKey]}
                          onChange={(e) => setPref(t.valueKey, Number(e.target.value))}
                        >
                          {t.choices.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </Picker>
                    )}
                    <Switch
                      label={t.label}
                      on={push.prefs[t.key]}
                      onToggle={() => setPref(t.key, !push.prefs[t.key])}
                    />
                  </Row>
                ))}
              </Group>
              <p className={note}>まとめは、赤の課題がある日だけ届くよ。</p>
            </section>

            <section className="flex flex-col gap-2">
              <Group>
                <SwitchRow
                  icon={Type}
                  label="通知に課題名を出す"
                  on={push.prefs.showTitle}
                  onToggle={() => setPref('showTitle', !push.prefs.showTitle)}
                />
              </Group>
              <p className={note}>
                オフのときは「実習記録」のように、種類で知らせるよ。課題名に患者さんのイニシャルや病名を入れているなら、オフのままにしてね。
              </p>
            </section>
          </>
        )}
      </>
    )
  }

  return (
    <section aria-label="通知" data-state={stateName} className="flex flex-col gap-6">
      {body}
      <p
        aria-live="polite"
        className={`-mt-2 px-4 text-sm empty:hidden ${
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
