import { useId, useState, type FormEvent } from 'react'
import { IMPORTANCE_LABEL, TASK_TYPE_KEYS, TASK_TYPES } from '../constants'
import { daysFromToday } from '../store/sample'
import type { Importance, Task, TaskType } from '../types'
import { fromDatetimeLocal, toDatetimeLocal } from '../utils/format'
import { Button } from './Button'

interface Props {
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  /** 新規追加時の締切の初期値を決める基準時刻 */
  now: number
  onSubmit: (task: Task) => void
  onCancel: () => void
}

const IMPORTANCES: Importance[] = [1, 2, 3]

const inputClass =
  'mt-1 block min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-primary-ink focus:ring-2 focus:ring-primary/25 focus:outline-none'

const labelClass = 'block text-sm font-medium text-ink'

/** 0.5刻みに丸める（最小0.5） */
const toHalf = (n: number) => Math.max(0.5, Math.round(n * 2) / 2)

export function TaskForm({ editing, now, onSubmit, onCancel }: Props) {
  const id = useId()
  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<TaskType>(editing?.type ?? 'rec')
  const [due, setDue] = useState(() =>
    toDatetimeLocal(editing?.due ?? daysFromToday(now, 1, 17, 0)),
  )
  const [estHours, setEstHours] = useState(String(editing?.estHours ?? TASK_TYPES.rec.defaultHours))
  // 見込み時間を手で変えたら、種類を変えても上書きしない（編集時は最初から手入力扱い）
  const [hoursTouched, setHoursTouched] = useState(Boolean(editing))
  const [progress, setProgress] = useState(editing?.progress ?? 0)
  const [importance, setImportance] = useState<Importance>(editing?.importance ?? 2)
  const [error, setError] = useState<string | null>(null)

  const changeType = (t: TaskType) => {
    setType(t)
    if (!hoursTouched) setEstHours(String(TASK_TYPES[t].defaultHours))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const dueMs = fromDatetimeLocal(due)
    const hours = Number(estHours)
    if (!title.trim()) return setError('課題名を入力してください')
    if (Number.isNaN(dueMs)) return setError('締切を入力してください')
    if (!Number.isFinite(hours) || hours <= 0)
      return setError('見込み時間は0.5h以上で入力してください')
    setError(null)
    onSubmit({
      ...editing,
      id: editing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      type,
      due: dueMs,
      estHours: toHalf(hours),
      progress,
      importance,
    })
    if (!editing) {
      setTitle('')
      setProgress(0)
      setHoursTouched(false)
      setEstHours(String(TASK_TYPES[type].defaultHours))
    }
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-xl border border-line bg-surface p-4"
    >
      <h2 id={`${id}-heading`} className="text-lg font-bold">
        {editing ? '課題を編集' : '課題を追加'}
      </h2>
      <form className="mt-3 flex flex-col gap-4" onSubmit={submit} noValidate>
        <div>
          <label htmlFor={`${id}-title`} className={labelClass}>
            課題名
          </label>
          <input
            id={`${id}-title`}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：実習記録（4日目）"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label htmlFor={`${id}-type`} className={labelClass}>
            種類
          </label>
          <select
            id={`${id}-type`}
            className={inputClass}
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

        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-[1fr_7rem]">
          <div className="min-w-0">
            <label htmlFor={`${id}-due`} className={labelClass}>
              締切
            </label>
            <input
              id={`${id}-due`}
              type="datetime-local"
              className={inputClass}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${id}-hours`} className={labelClass}>
              見込み時間（h）
            </label>
            <input
              id={`${id}-hours`}
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              className={inputClass}
              value={estHours}
              onChange={(e) => {
                setEstHours(e.target.value)
                setHoursTouched(true)
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-progress`} className={labelClass}>
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

        <fieldset>
          <legend className={labelClass}>重要度（成績・単位への影響）</legend>
          <div
            className="mt-1 grid grid-cols-3 overflow-hidden rounded-lg border border-line"
            role="radiogroup"
          >
            {IMPORTANCES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={importance === v}
                onClick={() => setImportance(v)}
                className={`min-h-11 border-line text-sm font-medium not-first:border-l ${
                  importance === v ? 'bg-primary text-white' : 'bg-surface text-ink hover:bg-paper'
                }`}
              >
                {IMPORTANCE_LABEL[v]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" className="flex-1">
            {editing ? '保存する' : '追加する'}
          </Button>
          {editing && <Button onClick={onCancel}>キャンセル</Button>}
        </div>
      </form>
    </section>
  )
}
