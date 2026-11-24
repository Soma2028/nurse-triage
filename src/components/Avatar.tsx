import { ICONS, type ProfileIcon } from '../social/profile'

/** プロフィールのアイコン（丸の中に絵）。色は紺の薄い面だけ（タッグの色は使わない） */
export function Avatar({ icon, size = 'md' }: { icon: ProfileIcon; size?: 'md' | 'lg' }) {
  const { Icon, label } = ICONS[icon]
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink ${
        size === 'lg' ? 'size-12' : 'size-8'
      }`}
    >
      <Icon aria-hidden className={size === 'lg' ? 'size-6' : 'size-4'} strokeWidth={2} />
    </span>
  )
}
