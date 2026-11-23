import { Minus, Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { IMPORTANCE_LABEL, TASK_TYPE_KEYS, TASK_TYPES } from '../constants'
import { daysFromToday } from '../store/sample'
import type { Importance, Task, TaskType } from '../types'
import { formatHours, fromDatetimeLocal, toDatetimeLocal } from '../utils/format'
import { Segmented } from './Segmented'

interface Props {
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  /** 新規追加時の締切の初期値を決める基準時刻 */
  now: number
  onSubmit: (task: Task) => void
}

const IMPORTANCES: Importance[] = [1, 2, 3]

const MIN_HOURS = 0.5
const MAX_HOURS = 99

const stepBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-paper disabled:opacity-40'

/** 課題の追加・編集フォーム（TaskSheet の中に置く） */
export function TaskForm({ editing, now, onSubmit }: Props) {
  const id = useId()
  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<TaskType>(editing?.type ?? 'rec')
  const [due, setDue] = useState(() =>
    toDatetimeLocal(editing?.due ?? daysFromToday(now, 1, 17, 0)),
  )
  const [estHours, setEstHours] = useState(editing?.estHours ?? TASK_TYPES.rec.defaultHours)
  // 見込み時間を手で変えたら、種類を変えても上書きしない（編集時は最初から手入力扱い）
  const [hoursTouched, setHoursTouched] = useState(Boolean(editing))
  const [progress, setProgress] = useState(editing?.progress ?? 0)
  const [importance, setImportance] = useState<Importance>(editing?.importance ?? 2)
  const [error, setError] = useState<string | null>(null)

  const changeType = (t: TaskType) => {
    setType(t)
    if (!hoursTouched) setEstHours(TASK_TYPES[t].defaultHours)
  }

  const stepHours = (d: number) => {
    setEstHours((h) => Math.min(MAX_HOURS, Math.max(MIN_HOURS, h + d)))
    setHoursTouched(true)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const dueMs = fromDatetimeLocal(due)
    if (!title.trim()) return setError('課題名を入れてね')
    if (Number.isNaN(dueMs)) return setError('締切を入れてね')
    setError(null)
    onSubmit({
      ...editing,
      id: editing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      type,
      due: dueMs,
      estHours,
      progress,
      importance,
    })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <div>
        <label htmlFor={`${id}-title`} className="ui-label">
          課題名
        </label>
        <input
          id={`${id}-title`}
          className="ui-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：実習記録（4日目）"
          autoComplete="off"
          required
        />
      </div>

      <div>
        <label htmlFor={`${id}-type`} className="ui-label">
          種類
        </label>
        <select
          id={`${id}-type`}
          className="ui-input"
          value={type}
          onChange={(e) => changeType(e.target.value as TaskType)}
        >
          {TASK_TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {TASK_TYPES[k].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-due`} className="ui-label">
          締切
        </label>
        <input
          id={`${id}-due`}
          type="datetime-local"
          className="ui-input"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="ui-label" id={`${id}-hours`}>
          見込み時間
        </p>
        <div className="flex items-center gap-1" role="group" aria-labelledby={`${id}-hours`}>
          <button
            type="button"
            className={stepBtn}
            onClick={() => stepHours(-0.5)}
            disabled={estHours <= MIN_HOURS}
            aria-label="見込み時間を30分減らす"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <output className="w-12 text-center text-base font-bold tabular-nums" aria-live="polite">
            {formatHours(estHours)}
          </output>
          <button
            type="button"
            className={stepBtn}
            onClick={() => stepHours(0.5)}
            disabled={estHours >= MAX_HOURS}
            aria-label="見込み時間を30分増やす"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div>
          <label htmlFor={`${id}-progress`} className="ui-label">
            進捗 <span className="tabular-nums">{progress}%</span>
          </label>
          <input
            id={`${id}-progress`}
            type="range"
            min={0}
            max={100}
            step={10}
            className="mt-1 h-11 w-full accent-primary"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
        </div>
      )}

      <div>
        <p className="ui-label" id={`${id}-imp`}>
          成績・単位への影響
        </p>
        <Segmented
          className="mt-1"
          label="成績・単位への影響"
          value={importance}
          onChange={setImportance}
          options={IMPORTANCES.map((v) => ({ value: v, label: IMPORTANCE_LABEL[v] }))}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong"
      >
        {editing ? '保存する' : '追加する'}
      </button>
    </form>
  )
}
