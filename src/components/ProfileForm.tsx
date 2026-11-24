import { ImagePlus } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  BIO_MAX,
  ICONS,
  NICKNAME_MAX,
  PROFILE_ICONS,
  textLength,
  type ProfileIcon,
  type ProfileInput,
} from '../social/profile'
import { photoToIcon } from '../social/photo'
import type { SaveResult } from '../social/useMyProfile'
import { Avatar } from './Avatar'
import { Group } from './Group'
import { Segmented } from './Segmented'

type Grade = number | 'secret'

const GRADES: { value: Grade; label: string }[] = [
  { value: 1, label: '1年' },
  { value: 2, label: '2年' },
  { value: 3, label: '3年' },
  { value: 4, label: '4年' },
  { value: 'secret', label: 'ひみつ' },
]

const label = 'px-4 text-xs font-bold tracking-wide text-ink-muted'
const inputClass =
  'min-h-12 w-full min-w-0 flex-1 bg-transparent pl-4 text-base text-ink placeholder:text-ink-muted focus:outline-none'

/** 文字数（多すぎたら太字。赤い文字にはしない） */
function Count({ n, max }: { n: number; max: number }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 pr-4 text-xs tabular-nums ${n > max ? 'font-bold text-ink' : 'text-ink-muted'}`}
    >
      {n}/{max}
    </span>
  )
}

/** プロフィールを作る・直すシートの中身 */
export function ProfileForm({
  current,
  onSave,
  onDone,
}: {
  current: ProfileInput | null
  onSave: (input: ProfileInput) => Promise<SaveResult>
  onDone: () => void
}) {
  const [nickname, setNickname] = useState(current?.nickname ?? '')
  const [icon, setIcon] = useState<ProfileIcon>(current?.icon ?? 'cat')
  /** 写真のアイコン（あれば絵のアイコンより先に使う） */
  const [photo, setPhoto] = useState<string | null>(current?.photo ?? null)
  const [reading, setReading] = useState(false)
  const [grade, setGrade] = useState<Grade>(current?.grade ?? 'secret')
  const [bio, setBio] = useState(current?.bio ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 写真を選んだら、端末の中で 128px に縮めてから使う */
  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じ写真をもう一度選んでも動くように
    if (!file) return
    setReading(true)
    setError(null)
    try {
      setPhoto(await photoToIcon(file))
    } catch {
      setError('写真を読み込めなかったよ。ほかの写真で試してね。')
    } finally {
      setReading(false)
    }
  }

  const nicknameLength = textLength(nickname.trim())
  const bioLength = textLength(bio.trim())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (nicknameLength === 0) return setError('ニックネームを入れてね。')
    if (nicknameLength > NICKNAME_MAX)
      return setError(`ニックネームは${NICKNAME_MAX}文字までだよ。`)
    if (bioLength > BIO_MAX) return setError(`ひとことは${BIO_MAX}文字までだよ。`)
    setBusy(true)
    setError(null)
    const result = await onSave({
      nickname: nickname.trim(),
      icon,
      photo,
      grade: grade === 'secret' ? null : grade,
      bio: bio.trim(),
    })
    setBusy(false)
    if (result === 'ok') return onDone()
    setError(
      result === 'invalid'
        ? '使えない文字が入っているみたい。'
        : result === 'limited'
          ? '続けて何回も保存したので、少し時間をおいてね。'
          : 'うまく保存できなかったよ。電波のいいところで、もう一度試してね。',
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className={label}>ニックネーム</h3>
        <Group>
          <div className="flex items-center gap-2">
            <input
              aria-label="ニックネーム"
              className={inputClass}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="フレンドに見える名前"
              autoComplete="nickname"
            />
            <Count n={nicknameLength} max={NICKNAME_MAX} />
          </div>
        </Group>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={label} id="profile-icon">
          アイコン
        </h3>
        <div className="ui-card flex items-center gap-3 rounded-2xl p-2 pl-3">
          <Avatar icon={icon} photo={photo} size="lg" />
          <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
            {/* iPhone では、写真を撮る・写真ライブラリから選ぶ、が出る */}
            <label
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink transition hover:bg-primary hover:text-on-primary ${reading ? 'opacity-60' : ''}`}
            >
              <ImagePlus aria-hidden className="size-4" />
              {photo ? '写真を変える' : '写真を選ぶ'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={reading}
                onChange={pickPhoto}
              />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="min-h-11 rounded-full px-3 text-sm font-bold text-ink-muted transition hover:bg-paper"
              >
                外す
              </button>
            )}
          </div>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="profile-icon"
          className="ui-card grid grid-cols-6 place-items-center gap-1 rounded-2xl p-2"
        >
          {PROFILE_ICONS.map((key) => {
            const { Icon, label: name } = ICONS[key]
            // 写真を使っているときは、どの絵も選んでいない見た目にする
            const active = !photo && key === icon
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={name}
                onClick={() => {
                  setIcon(key)
                  setPhoto(null)
                }}
                className={`inline-flex size-11 items-center justify-center rounded-full transition ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-primary-soft text-primary-ink hover:bg-line'
                }`}
              >
                <Icon aria-hidden className="size-5" strokeWidth={2} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={label}>学年</h3>
        <Segmented label="学年" value={grade} onChange={setGrade} options={GRADES} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={label}>ひとこと</h3>
        <Group>
          <div className="flex items-center gap-2">
            <input
              aria-label="ひとこと"
              className={inputClass}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="例：実習がんばる"
              autoComplete="off"
            />
            <Count n={bioLength} max={BIO_MAX} />
          </div>
        </Group>
      </section>

      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong disabled:opacity-60"
      >
        {current ? '保存する' : 'プロフィールを作る'}
      </button>
    </form>
  )
}
