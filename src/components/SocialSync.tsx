import type { MyProgress } from '../social/progress'
import { DeviceLink } from './DeviceLink'
import { FriendsRefresh } from './FriendsRefresh'
import { ProgressSync } from './ProgressSync'

/**
 * ログインした人の裏の仕事：今日の進み具合を送る・通知の端末にログインを付ける・
 * ホームのフレンドの様子のために一覧を読む。何も描かない。
 * どちらも Clerk を使うので、App からはこれだけを必要なときに読み込む
 */
export function SocialSync({ progress }: { progress: MyProgress }) {
  return (
    <>
      <ProgressSync progress={progress} />
      <DeviceLink />
      <FriendsRefresh />
    </>
  )
}
