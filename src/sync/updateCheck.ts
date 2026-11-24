/**
 * 新しい版を公開したら、開いたままのアプリも切り替える。
 *
 * iPhone のホーム画面のアプリは、閉じたつもりでも裏で開いたまま残り、戻ってきてもページを
 * 読み込み直さない。そのため、自分で閉じて開き直さない人は古い版を使い続けてしまう。
 * アプリに戻ってきたとき（と、開いている間はときどき）index.html を取り直し、
 * 読み込んでいる JS のファイル名がちがえば、新しい版とみなして読み込み直す。
 *
 * 読み込み直すのは、アプリに戻ってきた瞬間で、シートなどが開いていないときだけ
 * （使っている途中に急に画面が変わらないように）。課題は端末に保存してあるので消えない。
 */

/** 開いている間に新しい版を確かめる間隔 */
const CHECK_INTERVAL_MS = 30 * 60 * 1000
/** 読み込み直したばかりなら、もう一度は読み込み直さない（同じ版でくり返さないように） */
const RELOAD_GUARD_MS = 30_000
const RELOADED_AT_KEY = 'nurse-triage-reloaded-at'

const ENTRY = /\/assets\/index-[\w-]+\.js/

/** いま読み込んでいる JS のファイル名。開発中（vite dev）は無いので null */
function currentEntry(): string | null {
  for (const s of document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')) {
    const m = s.getAttribute('src')?.match(ENTRY)
    if (m) return m[0]
  }
  return null
}

/** 公開中の index.html が読み込む JS のファイル名。取れなければ null */
async function latestEntry(): Promise<string | null> {
  try {
    const res = await fetch('/', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.text()).match(ENTRY)?.[0] ?? null
  } catch {
    return null // 電波がないときなど。次の機会に確かめる
  }
}

/** シート・確認・入力の途中なら、いまは読み込み直さない */
function busy(): boolean {
  if (document.querySelector('[role="dialog"]')) return true
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

/** 読み込み直す。直前に読み込み直したばかりなら何もしない */
function reload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0)
    if (Date.now() - last < RELOAD_GUARD_MS) return false
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  } catch {
    return false // くり返しを止められないので、読み込み直さない
  }
  window.location.reload()
  return true
}

export function watchForUpdate(): void {
  // デプロイ後に古いページが、後から読み込む JS（せっていのプロフィールなど）を取ろうとして
  // 失敗したときも、新しい版に切り替える（Vite が知らせてくれる）
  window.addEventListener('vite:preloadError', (e) => {
    if (reload()) e.preventDefault()
  })

  const current = currentEntry()
  if (!current) return

  /** 新しい版が見つかったか（見つかったら、次にアプリに戻ってきたとき読み込み直す） */
  let found = false

  const check = async () => {
    if (found) return
    const latest = await latestEntry()
    if (latest && latest !== current) found = true
  }

  const onVisible = async () => {
    if (document.visibilityState !== 'visible') return
    await check()
    if (found && !busy()) reload()
  }

  document.addEventListener('visibilitychange', () => void onVisible())
  // ホーム画面のアプリは、戻ってきたときに pageshow だけ来ることもある
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) void onVisible()
  })
  window.setInterval(() => void check(), CHECK_INTERVAL_MS)
}
