import { Chevron } from './Chevron'

/** 優先度の決め方（折りたたみ） */
export function HowItWorks() {
  return (
    <details className="group ui-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-2 font-bold [&::-webkit-details-marker]:hidden">
        <Chevron />
        優先度の決め方
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-ink-muted">
        <p>
          課題ごとに<b className="text-ink">残りの作業時間</b>と、締切までに
          <b className="text-ink">使える時間</b>
          をくらべて、どれくらい追い込まれているかを出しているよ。
        </p>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <span className="shrink-0 rounded-full bg-tag-red px-2 font-bold text-white">赤</span>
            <span>
              締切を過ぎた・24時間を切った・使える時間の7割以上が必要・ほかの課題と合わせると間に合わない
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 rounded-full bg-tag-yellow px-2 font-bold text-slate-900">
              黄
            </span>
            <span>締切まで3日以内、または使える時間の3割以上が必要</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 rounded-full bg-tag-green px-2 font-bold text-white">緑</span>
            <span>それ以外。計画的に進めれば間に合う</span>
          </li>
        </ul>
        <p>
          <b className="text-ink">ほかの課題と合わせると足りない</b>
          ：締切の早い順に残りの作業を積み上げて、その締切までに使える時間を超えた分。1件ずつなら間に合うのに、まとめると足りない課題に気づけるよ。
        </p>
        <p>
          同じ色の中は、追い込まれ具合と締切の近さに、種類の重み（実習記録と看護過程は重め。実習中はさらに重く）と成績・単位への影響を掛けた点数の順。
        </p>
        <p>今日のプランは、今日使える時間を上の課題から0.5h ずつ割り振ったものだよ。</p>
        <p>
          スケジュールで実習・休みの印を付けると、使える時間を日ごとに数えるよ（実習の日は実習中の時間、休みは0h）。今日が実習の日なら「実習中」も自動でオンになるよ。
        </p>
      </div>
    </details>
  )
}
