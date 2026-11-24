import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadClerkKey } from './social/config.ts'
import { StoreProvider } from './store/StoreProvider.tsx'
import { registerServiceWorker } from './sync/registerSW.ts'

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
    <App />
  </StoreProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 「視差効果を減らす」の人には、動きを控えめにする */}
    <MotionConfig reducedMotion="user">
      {SocialRoot && clerkKey ? <SocialRoot clerkKey={clerkKey}>{app}</SocialRoot> : app}
    </MotionConfig>
  </StrictMode>,
)

registerServiceWorker()
