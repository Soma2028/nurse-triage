import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { useLocalProfile } from '../social/localProfile'
import { useMyProfile } from '../social/useMyProfile'
import { LoginForm } from './LoginForm'
import { ProfileForm } from './ProfileForm'
import { Sheet } from './Sheet'

const primaryBtn =
  'min-h-12 w-full rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60'

/**
 * はじめの画面の「アカウントを作る」。メールの6桁コードでログイン（登録していなければそのまま登録）し、
 * プロフィールがまだなければ続けてプロフィールを作るシートを出す。終わったら onDone。
 * Clerk を使うので、はじめの画面から必要なときだけ読み込む
 */
export function WelcomeAccount({ onDone }: { onDone: () => void }) {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMyProfile()
  const local = useLocalProfile()
  const [step, setStep] = useState<'idle' | 'login' | 'waiting'>('idle')
  /** ログインできて、プロフィールがまだないとき：作るシートを出す */
  const needProfile = step === 'waiting' && !!isSignedIn && me.status === 'ready' && !me.profile

  // ログインできて、プロフィールがもうある（か読めない）ときは、そのままはじめる（あとで、せっていから作れる）
  useEffect(() => {
    if (step !== 'waiting' || !isSignedIn || me.status === 'loading') return
    if (me.status === 'error' || me.profile) onDone()
  }, [step, isSignedIn, me.status, me.profile, onDone])

  return (
    <>
      <button
        type="button"
        disabled={!isLoaded || (step === 'waiting' && !needProfile)}
        onClick={() => setStep(isSignedIn ? 'waiting' : 'login')}
        className={primaryBtn}
      >
        {!isLoaded
          ? 'つないでいるよ'
          : step === 'waiting'
            ? '読み込んでいるよ'
            : 'アカウントを作る'}
      </button>
      <Sheet open={step === 'login'} title="アカウントを作る" onClose={() => setStep('idle')}>
        <LoginForm onDone={() => setStep('waiting')} />
      </Sheet>
      <Sheet open={needProfile} title="プロフィールを作る" onClose={onDone}>
        <ProfileForm current={local} onSave={me.save} onDone={onDone} />
      </Sheet>
    </>
  )
}
