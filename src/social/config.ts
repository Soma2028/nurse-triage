/**
 * Clerk の公開キーを /api/config から取る（フロント用の環境変数は使わない）。
 * 毎回の起動を待たせないよう、前に取れたキーを localStorage に置いておき、それですぐ始める。
 * 裏で取り直し、変わっていたら次の起動から使う。
 */
const CACHE_KEY = 'nurse-triage-clerk-key'
const FIRST_FETCH_TIMEOUT_MS = 3000

function readCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY)
  } catch {
    return null
  }
}

function writeCache(key: string | null) {
  try {
    if (key) localStorage.setItem(CACHE_KEY, key)
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // 保存できなくても、次の起動でまた取る
  }
}

async function fetchKey(): Promise<string | null> {
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error('設定を取れない')
  const data = (await res.json()) as { clerkPublishableKey?: unknown }
  return typeof data.clerkPublishableKey === 'string' && data.clerkPublishableKey
    ? data.clerkPublishableKey
    : null
}

/** 使う公開キー。取れなければ null（ログインの機能だけ使えない） */
export async function loadClerkKey(): Promise<string | null> {
  const cached = readCache()
  const fresh = fetchKey().then(
    (key) => {
      writeCache(key)
      return key
    },
    () => cached, // つながらないときは、前のキーのまま
  )
  if (cached) return cached
  // 初めての起動だけは取れるまで待つ（長くても3秒）
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), FIRST_FETCH_TIMEOUT_MS),
  )
  return Promise.race([fresh, timeout])
}
