import { ICONS, type ProfileIcon } from '../social/profile'

/**
 * プロフィールのアイコン（丸の中に絵か写真）。色は紺の薄い面だけ（タッグの色は使わない）。
 * 写真は長押しで保存などのメニューが出ないよう、押せないようにしてある（タップは外側に渡す）
 */
export function Avatar({
  icon,
  photo,
  size = 'md',
}: {
  icon: ProfileIcon
  photo?: string | null
  size?: 'md' | 'lg'
}) {
  const { Icon, label } = ICONS[icon]
  const box = size === 'lg' ? 'size-12' : 'size-8'
  if (photo) {
    return (
      <img
        src={photo}
        alt="プロフィールの写真"
        className={`pointer-events-none shrink-0 rounded-full bg-primary-soft object-cover ${box}`}
      />
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
