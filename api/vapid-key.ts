// VAPID の公開鍵を返す（公開してよい値）。ビルド時に VITE_VAPID_PUBLIC_KEY が入らなかったときの予備
export function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) return Response.json({ error: 'server not configured' }, { status: 500 })
  return Response.json(
    { publicKey },
    { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
  )
}
