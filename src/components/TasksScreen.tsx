import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { TASK_TYPES } from '../constants'
import type { Analysed, Task } from '../types'
import { formatDue } from '../utils/format'
import { Chara } from './Chara'
import { OverloadWarning } from './OverloadWarning'
import { ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Group } from './Group'
import { PageStack } from './PageStack'
import { TaskDetailPage } from './TaskDetailPage'
import { usePageNav } from './pageNav'
import { TaskRow } from './TaskRow'

type Tab = 'open' | 'done'

interface Props {
  onSetProgress: (id: string, progress: number) => void
  analysed: Analysed[]
  done: Task[]
  shortage: Analysed | undefined
  onAdd: () => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onRestore: (id: string) => void
}

/** 課題の一覧。未完了は優先順位どおりの1行ずつ（押すとくわしいページ）、完了は「戻す」で未完了に戻せる */
export function TasksScreen({
  analysed,
  done,
  shortage,
  onAdd,
  onSetProgress,
  onComplete,
  onEdit,
  onRemove,
  onRestore,
}: Props) {
  const [tab, setTab] = useState<Tab>('open')
  // くわしいページを開いている課題（null なら一覧）
  const { page: openId, dir, go: setOpenId, back, isTop } = usePageNav<string | null>(null)

  return (
    <PageStack pageKey={openId ?? 'list'} dir={dir} isTop={isTop} onBack={back}>
      {openId ? (
        <TaskDetailPage
          analysed={analysed}
          id={openId}
          backLabel="課題の一覧にもどる"
          onBack={back}
          onSetProgress={onSetProgress}
          onComplete={onComplete}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ) : (
        <ScreenLayout
          title="課題"
          sub={
            <Segmented
              label="表示する課題"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'open', label: '未完了', count: analysed.length },
                { value: 'done', label: '完了', count: done.length },
              ]}
            />
          }
          onAdd={onAdd}
        >
          {tab === 'open' ? (
            <div className="flex flex-col gap-2">
              <OverloadWarning a={shortage} />
              {analysed.length === 0 ? (
                <div className="flex items-center gap-4 px-2 py-4">
                  <Chara mood="happy" size={64} />
                  <p className="text-sm text-ink-muted">
                    <b className="block text-base text-ink">未完了の課題はないよ。</b>
                    新しい課題は右下の＋から追加してね。
                  </p>
                </div>
              ) : (
                <Group>
                  {analysed.map((a, i) => (
                    <TaskRow
                      key={a.task.id}
                      a={a}
                      rank={i + 1}
                      onOpen={() => setOpenId(a.task.id)}
                    />
                  ))}
                </Group>
              )}
            </div>
          ) : done.length === 0 ? (
            <p className="px-2 py-4 text-sm text-ink-muted">完了した課題はまだないよ。</p>
          ) : (
            <ul className="ui-card divide-y divide-line overflow-hidden rounded-2xl">
              {done.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ink-muted line-through decoration-ink-muted/60">
                      {t.title}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {TASK_TYPES[t.type].short}
                      {t.doneAt != null && ` ・ ${formatDue(t.doneAt)}に完了`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(t.id)}
                    aria-label={`「${t.title}」を未完了に戻す`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    戻す
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScreenLayout>
      )}
    </PageStack>
  )
}
