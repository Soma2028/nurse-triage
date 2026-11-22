import { motion } from 'framer-motion'
import type { Mood } from '../logic/speech'
import { float } from '../motion'

/**
 * src/assets/chara/{normal,worry,happy}.png を置くと、ビルド時にここで拾われる。
 * 置いていない表情は仮の SVG を出す（存在しない画像を読みに行かないので 404 も出ない）。
 */
const IMAGES = import.meta.glob<string>('../assets/chara/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
const imageFor = (mood: Mood): string | undefined => IMAGES[`../assets/chara/${mood}.png`]

const ALT: Record<Mood, string> = {
  normal: 'キャラクター（ふつうの顔）',
  worry: 'キャラクター（心配そうな顔）',
  happy: 'キャラクター（うれしそうな顔）',
}

/** 画像が用意されるまでの仮のキャラクター（丸い体にナースキャップ。十字は使わない） */
function Placeholder({ mood }: { mood: Mood }) {
  const ink = '#2b2620'
  return (
    <svg viewBox="0 0 120 120" className="size-full" role="img" aria-label={ALT[mood]}>
      <ellipse cx="60" cy="112" rx="30" ry="4" fill="rgb(43 38 32 / 0.08)" />
      <path
        d="M60 32c24 0 40 18 40 42 0 22-17 34-40 34S20 96 20 74c0-24 16-42 40-42Z"
        fill="#fffaf2"
        stroke="#d8d0c2"
        strokeWidth="2"
      />
      {/* ナースキャップ */}
      <path
        d="M39 38 44 20h32l5 18c-6 3-13 4-21 4s-15-1-21-4Z"
        fill="#ffffff"
        stroke="#cfc8bb"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M41.5 31c5 2 11 3 18.5 3s13.5-1 18.5-3"
        stroke="#1d3f6e"
        strokeWidth="4"
        fill="none"
      />
      {/* ほっぺ */}
      <ellipse cx="39" cy="80" rx="6" ry="4" fill="#f4b3a3" opacity="0.7" />
      <ellipse cx="81" cy="80" rx="6" ry="4" fill="#f4b3a3" opacity="0.7" />
      {mood === 'happy' ? (
        <>
          <path
            d="M43 70q5-6 10 0M67 70q5-6 10 0"
            stroke={ink}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M51 80q9 10 18 0"
            stroke={ink}
            strokeWidth="3"
            fill="#e9786a"
            strokeLinecap="round"
          />
        </>
      ) : mood === 'worry' ? (
        <>
          <path d="M42 63l9-4M78 63l-9-4" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="48" cy="70" rx="3.5" ry="4.5" fill={ink} />
          <ellipse cx="72" cy="70" rx="3.5" ry="4.5" fill={ink} />
          <path
            d="M52 85q4-4 8 0t8 0"
            stroke={ink}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse cx="48" cy="70" rx="3.5" ry="4.5" fill={ink} />
          <ellipse cx="72" cy="70" rx="3.5" ry="4.5" fill={ink} />
          <path
            d="M53 81q7 6 14 0"
            stroke={ink}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

interface Props {
  mood: Mood
  size?: number
  className?: string
}

/** 話しかけてくるキャラクター。ふわふわ浮く */
export function Chara({ mood, size = 72, className = '' }: Props) {
  const src = imageFor(mood)
  return (
    <motion.div
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      animate={float.animate}
      transition={float.transition}
    >
      {src ? (
        <img
          src={src}
          alt={ALT[mood]}
          width={size}
          height={size}
          className="size-full object-contain"
        />
      ) : (
        <Placeholder mood={mood} />
      )}
    </motion.div>
  )
}
