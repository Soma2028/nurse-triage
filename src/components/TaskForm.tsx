import { useId, useState, type FormEvent } from 'react'
import { IMPORTANCE_LABEL, TASK_TYPE_KEYS, TASK_TYPES } from '../constants'
import { daysFromToday } from '../store/sample'
import type { Importance, Task, TaskType } from '../types'
import { formatDue, fromDatetimeLocal, toDatetimeLocal } from '../utils/format'
import { Group, HoursStepper, Picker, Row } from './Group'
import { Segmented } from './Segmented'

interface Props {
  /** 編集中の課題。なければ新規追加 */
  editing?: Task
  /** 新規追加時の締切の初期値を決める基準時刻 */
  now: number
  /** 新規追加時の締切の初期値（カレンダーの日付から追加したとき）。なければ明日の 17:00 */
  defaultDue?: number
  onSubmit: (task: Task) => void
}

const IMPORTANCES: Importance[] = [1, 2, 3]

const MIN_HOURS = 0.5
const MAX_HOURS = 99

/** 課題の追加・編集フォーム（TaskSheet の中に置く） */
export function TaskForm({ editing, now, defaultDue, onSubmit }: Props) {
  const id = useId()
  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<TaskType>(editing?.type ?? 'rec')
  const [due, setDue] = useState(() =>
    toDatetimeLocal(editing?.due ?? defaultDue ?? daysFromToday(now, 1, 17, 0)),
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

  const changeHours = (h: number) => {
    setEstHours(h)
    setHoursTouched(true)
  }

  const dueMs = fromDatetimeLocal(due)

  const submit = (e: FormEvent) => {
    e.preventDefault()
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
      <Group>
        <input
          id={`${id}-title`}
          aria-label="課題名"
          className="min-h-12 w-full min-w-0 bg-transparent px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="課題名　例：実習記録 4日目"
          autoComplete="off"
          required
        />
      </Group>

      <Group>
        <Row label="種類" htmlFor={`${id}-type`}>
          <Picker text={TASK_TYPES[type].short}>
            <select
              id={`${id}-type`}
              className="ui-picker"
              value={type}
              onChange={(e) => changeType(e.target.value as TaskType)}
            >
              {TASK_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {TASK_TYPES[k].label}
                </option>
              ))}
            </select>
          </Picker>
        </Row>
        <Row label="締切" htmlFor={`${id}-due`}>
          <Picker text={Number.isNaN(dueMs) ? '選んでね' : formatDue(dueMs)}>
            <input
              id={`${id}-due`}
              type="datetime-local"
              className="ui-picker"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              required
            />
          </Picker>
        </Row>
        <Row label="見込み時間">
          <HoursStepper
            label="見込み時間"
            value={estHours}
            min={MIN_HOURS}
            max={MAX_HOURS}
            onChange={changeHours}
          />
        </Row>
        {editing && (
          <div className="px-4 pt-3 pb-1">
            <label
              htmlFor={`${id}-progress`}
              className="flex items-center gap-3 text-base text-ink"
            >
              <span className="flex-1">進捗</span>
              <span className="pr-2 font-bold tabular-nums">{progress}%</span>
            </label>
            <input
              id={`${id}-progress`}
              type="range"
              min={0}
              max={100}
              step={10}
              className="h-11 w-full accent-primary"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>
        )}
      </Group>

      <Group label="成績・単位への影響">
        <div className="p-1">
          <Segmented
            className="border-0"
            label="成績・単位への影響"
            value={importance}
            onChange={setImportance}
            options={IMPORTANCES.map((v) => ({ value: v, label: IMPORTANCE_LABEL[v] }))}
          />
        </div>
      </Group>

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
