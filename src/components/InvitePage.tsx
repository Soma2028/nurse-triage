import { Chara } from './Chara'
import { CodeCopy } from './CodeCopy'
import { Phrase } from './Phrase'
import { ScreenLayout } from './ScreenLayout'

const label = 'px-4 text-xs font-bold tracking-wide text-ink-muted'

/** 手順の番号つきの一覧（白い面の中に1行ずつ） */
function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={label}>{title}</h2>
      <ol className="ui-card divide-y divide-line overflow-hidden rounded-2xl">
        {steps.map((s, i) => (
          <li
            key={s}
            className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm leading-6 text-ink"
          >
            <span
              aria-hidden
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink tabular-nums"
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <Phrase text={s} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * 招待リンク（/f/コード）を Safari や LINE で開いたときの専用ページ。
 * iPhone ではリンクからホーム画面のアプリを開けないので、コードをコピーしてアプリで貼り付けてもらう。
 * アプリの画面（課題・タブ）は出さない。onUseHere で、このブラウザのままアプリを開いて申請する
 */
export function InvitePage({ code, onUseHere }: { code: string; onUseHere: () => void }) {
  return (
    <div className="h-full">
      <ScreenLayout title="フレンドの招待">
        <div className="ui-text flex flex-col gap-6">
          <div className="flex items-center gap-4 px-2">
            <Chara mood="happy" size={72} />
            <p className="text-sm leading-6 text-ink">
              <b className="block text-base">フレンドになろう。</b>
              <Phrase text="看護トリアージで、今日の進み具合を見せ合って応援できるよ。" />
            </p>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className={label}>フレンドのコード</h2>
            <CodeCopy code={code} />
          </section>

          <Steps
            title="アプリを持っている人"
            steps={[
              'このコードをコピーする',
              'ホーム画面の「看護トリアージ」を開く',
              'せってい → フレンド →「追加と設定」で、貼り付けのボタンを押して申請する',
            ]}
          />

          <Steps
            title="まだ持っていない人"
            steps={[
              'このコードをコピーする',
              'Safari の共有ボタンから「ホーム画面に追加」する',
              'ホーム画面から開いて、せっていでログインする',
              'フレンドの「追加と設定」で、コードを貼り付けて申請する',
            ]}
          />

          <button
            type="button"
            onClick={onUseHere}
            className="min-h-11 self-center rounded-full px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
          >
            このブラウザで申請する
          </button>
        </div>
      </ScreenLayout>
    </div>
  )
}
