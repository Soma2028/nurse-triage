import { Button } from './Button'
import { Chevron } from './Chevron'

interface Props {
  onResetSample: () => void
  onClearAll: () => void
}

export function HowItWorks({ onResetSample, onClearAll }: Props) {
  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-heading text-lg font-bold select-none [&::-webkit-details-marker]:hidden">
        <Chevron />
        優先度の決め方
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-ink">
        <p>
          各課題の<strong>残り作業時間</strong>（見込み時間×未完了の割合）と、締切までに
          <strong>使える時間</strong>（残り日数×1日に使える時間）を比べて、逼迫度を出します。
        </p>
        <ul className="space-y-1.5">
          <li>
            <span className="mr-1 inline-block rounded bg-tag-red px-1.5 font-bold text-white">
              赤
            </span>
            期限切れ、締切まで24時間未満、使える時間の7割以上が必要、または他の課題と合わせると間に合わない
          </li>
          <li>
            <span className="mr-1 inline-block rounded bg-tag-yellow px-1.5 font-bold text-ink">
              黄
            </span>
            締切まで3日以内、または使える時間の3割以上が必要
          </li>
          <li>
            <span className="mr-1 inline-block rounded bg-tag-green px-1.5 font-bold text-white">
              緑
            </span>
            それ以外。計画的に進めれば間に合う
          </li>
        </ul>
        <p>
          <strong>他の課題と合わせて不足</strong>
          ：締切の早い順に残り作業を積み上げ、その課題の締切までに使える時間を超えた分です。1件ずつ見ると間に合うのに、まとめると足りない課題を見つけます。
        </p>
        <p>
          同じ色の中は、逼迫度・締切の近さに、種類の重み（実習記録・看護過程が重め。実習期間中はさらに重く）と重要度を掛けた点数の高い順に並べます。
        </p>
        <p>今日のプランは、1日に使える時間を上の課題から0.5時間単位で割り振ったものです。</p>
        <p>
          <strong>実習スケジュール</strong>
          ：カレンダーで実習日・休みの印を付けると、使える時間を日ごとに（実習日は実習中の時間、休みは0時間、印のない日は通常期の時間で）合計します。今日が実習日なら「実習期間中」も自動で切り替わります（手動で今日だけ変えることもできます）。
        </p>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button onClick={onResetSample}>サンプルに戻す</Button>
          <Button variant="danger" onClick={onClearAll}>
            すべて消す
          </Button>
        </div>
      </div>
    </details>
  )
}
