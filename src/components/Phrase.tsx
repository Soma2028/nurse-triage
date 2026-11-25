import { Fragment } from 'react'
// budoux の入り口（'budoux'）は中国語・タイ語のモデルや HTML の処理まで読み込み、main の JS が約390kB 増える。
// 日本語のモデルと Parser だけを直接読み込む（package.json の exports にない場所なので、相対パスで指す）
import { model } from '../../node_modules/budoux/module/data/models/ja.js'
import { Parser } from '../../node_modules/budoux/module/parser.js'

const parser = new Parser(model)

/**
 * 日本語の文を文節（「締切までに／使えるのは／約3.6h」）に分け、そのあいだにだけ折り返しの候補（<wbr>）を置く。
 * 外側に ui-text（word-break: keep-all）があると、文節の途中では折り返さない
 */
export function Phrase({ text }: { text: string }) {
  const parts = parser.parse(text)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {p}
        </Fragment>
      ))}
    </>
  )
}
