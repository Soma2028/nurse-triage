import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/** QR のまわりの白い余白（マスの数）。読み取りに必要 */
const QUIET = 4

/**
 * 文字列を QR コードの SVG にする。iPhone のカメラで読めるよう、白地に炭色で、余白を付ける
 */
export function QrCode({
  text,
  label,
  size: display = 'md',
}: {
  text: string
  label: string
  /** lg は画面いっぱい近くまで大きく（Zoom の中） */
  size?: 'md' | 'lg'
}) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(y, x)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
      }
    }
    return { size: n + QUIET * 2, path: d }
  }, [text])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`rounded-2xl bg-surface ${display === 'lg' ? 'size-[min(72vw,288px)]' : 'size-48'}`}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#2b2620" />
    </svg>
  )
}
