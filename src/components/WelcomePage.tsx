import { lazy, Suspense } from 'react'
import { useSocialAvailable } from '../social/SocialContext'
import { useBackupImport } from './backupImport'
import { Chara } from './Chara'
import { Phrase } from './Phrase'
import { ScreenLayout } from './ScreenLayout'

// ログインは Clerk を使うので、別のファイルに分けて必要なときだけ読み込む
const WelcomeAccount = lazy(() =>
  import('./WelcomeAccount').then((m) => ({ default: m.WelcomeAccount })),
)

const primaryBtn =
  'min-h-12 w-full rounded-full bg-primary text-base font-bold text-on-primary transition disabled:opacity-60'
const plainBtn =
  'min-h-12 w-full rounded-full border border-line bg-surface px-4 text-base font-bold text-ink transition hover:bg-paper'
const note = 'px-4 text-center text-xs leading-5 text-ink-muted'

/**
 * はじめの画面（初めて開いたとき・ホーム画面に追加し直したとき）。
 * アカウントを作る（ログイン → プロフィール）か、ゲストではじめるかを選ぶ。
 * 入れ直した人のために、バックアップから読み込むこともできる。どれかを選んだら onDone
 */
export function WelcomePage({ onDone }: { onDone: () => void }) {
  const social = useSocialAvailable()
  const importer = useBackupImport(onDone)

  return (
    <div className="h-full">
      <ScreenLayout title="ようこそ">
        <div className="ui-text flex flex-col gap-6 pt-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <Chara mood="happy" size={120} />
            <div>
              <p className="text-title font-bold text-ink">看護トリアージ</p>
              <p className="mt-2 text-sm leading-6 text-ink">
                <Phrase text="課題の締切と残りの量から、今日やることを決めるアプリだよ。" />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {social ? (
              <Suspense
                fallback={
                  <button type="button" disabled className={primaryBtn}>
                    つないでいるよ
                  </button>
                }
              >
                <WelcomeAccount onDone={onDone} />
              </Suspense>
            ) : (
              <p className="px-4 text-center text-sm leading-6 text-ink">
                <Phrase text="いまはつながらないので、アカウントはあとで、せっていから作ってね。" />
              </p>
            )}
            {social && (
              <p className={note}>
                <Phrase text="アカウントがあると、フレンドと今日の進み具合を見せ合えるよ。前に作った人も、ここからログインできるよ。" />
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={onDone} className={plainBtn}>
              ゲストではじめる
            </button>
            <p className={note}>
              <Phrase text="ゲストでも、課題・カレンダー・通知は使えるよ。あとで、せっていからいつでもアカウントを作れるよ。" />
            </p>
          </div>

          <button
            type="button"
            onClick={importer.pick}
            className="min-h-11 self-center rounded-full px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
          >
            バックアップから読み込む
          </button>
          {importer.error && (
            <p role="alert" className="px-4 text-center text-sm font-bold text-danger">
              {importer.error}
            </p>
          )}
          {importer.element}
        </div>
      </ScreenLayout>
    </div>
  )
}
