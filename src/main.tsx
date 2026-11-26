import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadClerkKey } from './social/config.ts'
import { inviteCodeInUrl, takeInviteFromUrl } from './social/invite.ts'
import { Root } from './Root.tsx'
import { FirstRunGate } from './FirstRunGate.tsx'
import { isFirstRun } from './store/firstRun.ts'
import { StoreProvider } from './store/StoreProvider.tsx'
import { registerServiceWorker } from './sync/registerSW.ts'
import { watchForUpdate } from './sync/updateCheck.ts'
import { fixViewportOnRotate } from './viewportFix.ts'

// 招待リンク（/f/コード）から開いたとき。
// ホーム画面のアプリの中なら、コードを覚えてアドレスを / に戻し、アプリの上に招待のシートを出す。
// Safari・LINE などで開いたら、アプリの代わりに招待の専用ページ（InvitePage）を出す
// （iPhone ではリンクからホーム画面のアプリを開けないので、コードをコピーしてアプリで貼り付けてもらう）
// 初めて開いたか（ストアが保存する前に調べる）。招待リンクから来たときは、招待の案内を優先する
const firstRun = isFirstRun() && inviteCodeInUrl() === null

const nav = navigator as Navigator & { standalone?: boolean }
const standalone =
  nav.standalone === true || (window.matchMedia?.('(display-mode: standalone)').matches ?? false)
const invitePageCode = standalone ? null : inviteCodeInUrl()
if (standalone) takeInviteFromUrl()

// ログインの機能（Clerk）は、公開キーが取れたときだけ読み込む。
// 取れなくても、読み込めなくても、課題・カレンダー・通知はいつもどおり使える
const clerkKey = await loadClerkKey()
const SocialRoot = clerkKey
  ? await import('./social/SocialRoot.tsx').then(
      (m) => m.SocialRoot,
      () => null,
    )
  : null

const app = (
  <StoreProvider>
    <FirstRunGate firstRun={firstRun}>
      <App />
    </FirstRunGate>
  </StoreProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 「視差効果を減らす」の人には、動きを控えめにする */}
    <MotionConfig reducedMotion="user">
      {SocialRoot && clerkKey ? (
        <SocialRoot clerkKey={clerkKey}>
          <Root inviteCode={invitePageCode} app={app} />
        </SocialRoot>
      ) : (
        <Root inviteCode={invitePageCode} app={app} />
      )}
    </MotionConfig>
  </StrictMode>,
)

registerServiceWorker()
// 新しい版を公開したら、開いたままのホーム画面のアプリも、戻ってきたときに切り替える
watchForUpdate()
// iPhone で横から縦に戻したとき、ページ全体がずれたまま残らないように
fixViewportOnRotate()
