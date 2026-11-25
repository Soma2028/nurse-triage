import { useState } from 'react'
import { ICONS, type ProfileIcon } from '../social/profile'
import { Zoom } from './Zoom'

/**
 * プロフィールのアイコン（丸の中に絵か写真）。色は紺の薄い面だけ（タッグの色は使わない）。
 * 写真は長押しで保存などのメニューが出ないよう、押せないようにしてある（タップは外側に渡す）。
 * zoomable を付けると、写真をタップで大きく見られる（行全体が押せる場所では付けない）
 */
export function Avatar({
  icon,
  photo,
  size = 'md',
  zoomable = false,
}: {
  icon: ProfileIcon
  photo?: string | null
  size?: 'md' | 'lg'
  zoomable?: boolean
}) {
  const [zoom, setZoom] = useState(false)
  const { Icon, label } = ICONS[icon]
  const box = size === 'lg' ? 'size-12' : 'size-8'
  if (photo) {
    const img = (
      <img
        src={photo}
        alt="プロフィールの写真"
        className={`pointer-events-none shrink-0 rounded-full bg-primary-soft object-cover ${box}`}
      />
    )
    if (!zoomable) return img
    return (
      <>
        {/* 押せる範囲は 44px 以上にする（見た目は 48px の丸のまま） */}
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="写真を大きく見る"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full"
        >
          {img}
        </button>
        <Zoom open={zoom} label="プロフィールの写真" onClose={() => setZoom(false)}>
          <img
            src={photo}
            alt="プロフィールの写真"
            className="ui-card-raised pointer-events-none aspect-square w-[min(72vw,288px)] rounded-full bg-primary-soft object-cover"
          />
        </Zoom>
      </>
    )
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink ${box}`}
    >
      <Icon aria-hidden className={size === 'lg' ? 'size-6' : 'size-4'} strokeWidth={2} />
    </span>
  )
}
