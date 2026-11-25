import { loadDefaultJapaneseParser } from 'budoux'
import { Fragment } from 'react'

const parser = loadDefaultJapaneseParser()

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
