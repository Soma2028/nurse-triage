import { Chara } from './Chara'
import type { Speech as SpeechData } from '../logic/speech'

/** キャラクターの右に置く、角丸の吹き出し（夢のタネと同じ形） */
function Bubble({ lines }: { lines: string[] }) {
  return (
    <div className="relative min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3">
      <span
        aria-hidden
        className="absolute top-5 -left-1.5 size-3 rotate-45 border-b border-l border-line bg-surface"
      />
      {lines.map((line, i) => (
        <p key={i} className={`leading-relaxed ${i === 0 ? 'font-bold' : 'text-ink-muted'}`}>
          {line}
        </p>
      ))}
    </div>
  )
}

/** キャラクター＋吹き出し */
export function CharaSpeech({ speech, size = 72 }: { speech: SpeechData; size?: number }) {
  return (
    <div className="flex items-start gap-3" aria-live="polite">
      <Chara mood={speech.mood} size={size} />
      <Bubble lines={speech.lines} />
    </div>
  )
}
