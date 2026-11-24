// アプリが起動時に読む公開の設定（Clerk の公開キー）。フロント用の環境変数を使わないため、ここから渡す
export function GET() {
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || null
  return Response.json(
    { clerkPublishableKey },
    { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
  )
}
