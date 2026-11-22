import { useId, useState, type FormEvent } from 'react'
import { IMPORTANCE_LABEL, TASK_TYPE_KEYS, TASK_TYPES } from '../constants'
import { daysFromToday } from '../store/sample'
import type { Importance, Task, TaskType } from '../types'
import { fromDatetimeLocal, toDatetimeLocal } from '../utils/format'
import { Segmented } from './Segmented'

interface Props {
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  /** 新規追加時の締切の初期値を決める基準時刻 */
  now: number
  onSubmit: (task: Task) => void
  onCancel: () => void
}

const IMPORTANCES: Importance[] = [1, 2, 3]

/** 0.5刻みに丸める（最小0.5） */
const toHalf = (n: number) => Math.max(0.5, Math.round(n * 2) / 2)

/** 課題の追加・編集フォーム（TaskSheet の中に置く） */
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
    if (!title.trim()) return setError('課題名を入れてね')
    if (Number.isNaN(dueMs)) return setError('締切を入れてね')
    if (!Number.isFinite(hours) || hours <= 0) return setError('見込み時間は0.5h以上にしてね')
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

      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-[1fr_7rem]">
        <div className="min-w-0">
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
        <div>
          <label htmlFor={`${id}-hours`} className="ui-label">
            見込み時間（h）
          </label>
          <input
            id={`${id}-hours`}
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            className="ui-input"
            value={estHours}
            onChange={(e) => {
              setEstHours(e.target.value)
              setHoursTouched(true)
            }}
          />
        </div>
      </div>

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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-full border border-line bg-surface px-5 font-bold text-ink-muted transition hover:bg-paper"
        >
          やめる
        </button>
        <button
          type="submit"
          className="min-h-12 flex-1 rounded-full bg-primary font-bold text-on-primary transition hover:bg-primary-strong"
        >
          {editing ? '保存する' : '追加する'}
        </button>
      </div>
    </form>
  )
}
