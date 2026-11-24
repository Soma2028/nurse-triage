/**
 * 写真のアイコンを作る：選んだ写真を、まん中で正方形に切り抜き、192px の JPEG（10KB ほど）にする。
 * タップで大きく見たときに粗くなりすぎない大きさ（サーバーの上限 40,000 文字に収まる）。
 * 縮めた画像だけを使い、元の写真は端末の外に出さない。
 */
const SIZE = 192
const QUALITY = 0.72

/** 画像を読む。向き（スマホで縦に撮った写真など）は写真の情報どおりに直す */
async function load(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // createImageBitmap が使えないときは <img> で読む
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/** 写真を 192px の正方形の JPEG の data URL にする。画像でなければ例外 */
export async function photoToIcon(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('画像ではない')
  const img = await load(file)
  const w = img.width
  const h = img.height
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas が使えない')
  // 透明な部分は白にする（JPEG は透明にできない）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE)
  if ('close' in img) img.close()
  return canvas.toDataURL('image/jpeg', QUALITY)
}
