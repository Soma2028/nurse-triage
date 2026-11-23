// VAPID の公開鍵を返す（公開してよい値）。アプリはここから取るので、フロント用の環境変数はいらない
export function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) return Response.json({ error: 'server not configured' }, { status: 500 })
  return Response.json(
    { publicKey },
    { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
  )
}
