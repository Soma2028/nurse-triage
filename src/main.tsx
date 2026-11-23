import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './store/StoreProvider.tsx'
import { registerServiceWorker } from './sync/registerSW.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 「視差効果を減らす」の人には、動きを控えめにする */}
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <App />
      </StoreProvider>
    </MotionConfig>
  </StrictMode>,
)

registerServiceWorker()
