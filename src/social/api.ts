/**
 * ログインした人向けの API（/api/account など）を呼ぶ。Clerk のセッショントークンを付けて送る。
 * 失敗しても例外は投げず、status 0（つながらない）などで返す。
 */
export interface AuthedResult {
  ok: boolean
  status: number // 0 はネットワークにつながらなかった
  data: Record<string, unknown> | null
}

export type GetToken = () => Promise<string | null>

export async function authedCall(
  getToken: GetToken,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<AuthedResult> {
  try {
    const token = await getToken()
    if (!token) return { ok: false, status: 401, data: null }
    const res = await fetch(path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    let data: Record<string, unknown> | null = null
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      // 本文がなくてもよい
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}
