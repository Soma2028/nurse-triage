import { useSignIn, useSignUp } from '@clerk/react'
import { useState, type FormEvent } from 'react'
import { Group } from './Group'

type Step = 'email' | 'code'
/** いまの流れ：登録ずみの人はログイン、まだの人は新しく登録 */
type Mode = 'signIn' | 'signUp'

/** Clerk のエラーから、コード（form_code_incorrect など）を取り出す */
function errorCode(error: unknown): string {
  const e = error as { code?: string; errors?: { code?: string }[] } | null
  return e?.errors?.[0]?.code ?? e?.code ?? ''
}

/** エラーを、やわらかい一言にする */
function errorText(error: unknown): string {
  const code = errorCode(error)
  if (code === 'form_code_incorrect') return 'コードがちがうみたい。もう一度入れてね。'
  if (code === 'verification_expired') return 'コードの期限が切れたよ。もう一度送ってね。'
  if (code === 'verification_failed' || code === 'too_many_requests')
    return '何回もまちがえたので、少し時間をおいてね。'
  if (code.startsWith('form_param_format_invalid') || code === 'form_param_nil')
    return 'メールアドレスを確かめてね。'
  return 'うまくいかなかったよ。電波のいいところで、もう一度試してね。'
}

const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60'
const textBtn =
  'min-h-11 rounded-full px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-soft disabled:opacity-60'
const inputClass =
  'min-h-12 w-full min-w-0 bg-transparent px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none'

/**
 * ログインのシートの中身。メールアドレス → 届いた6桁のコード、の2段。
 * 登録していないメールアドレスなら、そのまま新しく登録する（パスワードはない）
 */
export function LoginForm({ onDone }: { onDone: () => void }) {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const [step, setStep] = useState<Step>('email')
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /** メールにコードを送る。登録していなければ、新しく登録する流れに切り替える */
  const sendCode = async (address: string) => {
    const signInResult = await signIn.emailCode.sendCode({ emailAddress: address })
    if (!signInResult.error) return { mode: 'signIn' as const, error: null }
    if (errorCode(signInResult.error) !== 'form_identifier_not_found') {
      return { mode: 'signIn' as const, error: signInResult.error }
    }
    const created = await signUp.create({ emailAddress: address })
    if (created.error) return { mode: 'signUp' as const, error: created.error }
    const sent = await signUp.verifications.sendEmailCode()
    return { mode: 'signUp' as const, error: sent.error }
  }

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!address.includes('@')) return setError('メールアドレスを確かめてね。')
    setBusy(true)
    setError(null)
    const result = await sendCode(address)
    setBusy(false)
    if (result.error) return setError(errorText(result.error))
    setMode(result.mode)
    setCode('')
    setNotice(null)
    setStep('code')
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    const value = code.replace(/\D/g, '')
    if (value.length !== 6) return setError('6桁のコードを入れてね。')
    setBusy(true)
    setError(null)
    const verified =
      mode === 'signIn'
        ? await signIn.emailCode.verifyCode({ code: value })
        : await signUp.verifications.verifyEmailCode({ code: value })
    if (verified.error) {
      setBusy(false)
      return setError(errorText(verified.error))
    }
    // ログインした状態にする
    const finalized = mode === 'signIn' ? await signIn.finalize() : await signUp.finalize()
    setBusy(false)
    if (finalized.error) return setError(errorText(finalized.error))
    onDone()
  }

  const resend = async () => {
    setBusy(true)
    setError(null)
    const result =
      mode === 'signIn'
        ? await signIn.emailCode.sendCode({ emailAddress: email.trim() })
        : await signUp.verifications.sendEmailCode()
    setBusy(false)
    if (result.error) setError(errorText(result.error))
    else setNotice('もう一度送ったよ。')
  }

  return (
    <div className="flex flex-col gap-4">
      {step === 'email' ? (
        <form onSubmit={submitEmail} noValidate className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            メールアドレスに、ログインのコードを送るよ。パスワードはいらないよ。
          </p>
          <Group>
            <input
              type="email"
              aria-label="メールアドレス"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Group>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <button type="submit" className={primaryBtn} disabled={busy}>
            コードを送る
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-ink">
            <span className="font-bold break-all">{email.trim()}</span>{' '}
            に届いた6桁のコードを入れてね。
          </p>
          <Group>
            <input
              aria-label="6桁のコード"
              className={`${inputClass} text-center tracking-widest tabular-nums`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />
          </Group>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          {notice && !error && (
            <p aria-live="polite" className="text-sm text-ink-muted">
              {notice}
            </p>
          )}
          <button type="submit" className={primaryBtn} disabled={busy}>
            ログインする
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={textBtn} onClick={resend} disabled={busy}>
              コードをもう一度送る
            </button>
            <button
              type="button"
              className={textBtn}
              onClick={() => {
                setStep('email')
                setError(null)
              }}
              disabled={busy}
            >
              メールアドレスを変える
            </button>
          </div>
        </form>
      )}
      {/* 新しく登録するときのロボット対策（Clerk がここに出す。ふだんは見えない） */}
      <div id="clerk-captcha" />
    </div>
  )
}
