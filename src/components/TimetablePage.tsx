import { useId, useState, type FormEvent } from 'react'
import {
  cleanSlot,
  fromTimeInput,
  NAME_MAX,
  PERIOD_COUNT,
  ROOM_MAX,
  slotKey,
  toMinutes,
  toTimeInput,
} from '../logic/timetable'
import type { ClassSlot, Period, Timetable } from '../types'
import { Group, Picker, Row, SwitchRow } from './Group'
import { Sheet } from './Sheet'

const WEEKDAYS = ['', '月', '火', '水', '木', '金', '土']

const primaryBtn =
  'min-h-12 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong'
const plainBtn =
  'min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper'
const inputCls =
  'min-h-12 w-full min-w-0 bg-transparent px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none'

/** いま開いているシート：コマ（曜日・時限）か、時限の時刻 */
type Editing =
  { kind: 'class'; weekday: number; period: number } | { kind: 'period'; period: number }

/** コマの授業名・教室を決めるシートの中身 */
function ClassForm({
  slot,
  onSave,
  onClear,
}: {
  slot: ClassSlot | undefined
  onSave: (slot: ClassSlot | null) => void
  onClear: () => void
}) {
  const id = useId()
  const [name, setName] = useState(slot?.name ?? '')
  const [room, setRoom] = useState(slot?.room ?? '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave(cleanSlot(name, room))
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Group>
        <input
          id={`${id}-name`}
          aria-label="授業の名前"
          className={inputCls}
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="授業の名前　例：成人看護学"
          autoComplete="off"
        />
        <input
          id={`${id}-room`}
          aria-label="教室"
          className={inputCls}
          value={room}
          maxLength={ROOM_MAX}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="教室　例：302"
          autoComplete="off"
        />
      </Group>
      <button type="submit" className={primaryBtn}>
        保存する
      </button>
      {slot && (
        <button type="button" onClick={onClear} className={plainBtn}>
          このコマを空ける
        </button>
      )}
    </form>
  )
}

/** 時限の始まり・終わりの時刻を決めるシートの中身 */
function PeriodForm({ time, onSave }: { time: Period; onSave: (time: Period) => void }) {
  const id = useId()
  const [start, setStart] = useState(toTimeInput(time.start))
  const [end, setEnd] = useState(toTimeInput(time.end))
  const [error, setError] = useState<string | null>(null)
  const s = fromTimeInput(start)
  const e = fromTimeInput(end)
  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!s || !e) return setError('時刻を入れてね')
    if (toMinutes(e) <= toMinutes(s)) return setError('終わりは始まりより後にしてね')
    onSave({ start: s, end: e })
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Group>
        <Row label="始まり" htmlFor={`${id}-start`}>
          <Picker text={s || '選んでね'}>
            <input
              id={`${id}-start`}
              type="time"
              className="ui-picker"
              value={start}
              onChange={(ev) => setStart(ev.target.value)}
              onClick={(ev) => ev.currentTarget.showPicker?.()}
            />
          </Picker>
        </Row>
        <Row label="終わり" htmlFor={`${id}-end`}>
          <Picker text={e || '選んでね'}>
            <input
              id={`${id}-end`}
              type="time"
              className="ui-picker"
              value={end}
              onChange={(ev) => setEnd(ev.target.value)}
              onClick={(ev) => ev.currentTarget.showPicker?.()}
            />
          </Picker>
        </Row>
      </Group>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <button type="submit" className={primaryBtn}>
        保存する
      </button>
    </form>
  )
}

/**
 * せっていの「時間割」のページ。月〜金（と土）× 1〜6限の表で、マスを押すと授業を入れるシート、
 * 左の時限を押すと時刻を変えるシートが開く。時間割は端末の中だけに置く
 */
export function TimetablePage({
  timetable,
  todayWeekday,
  onSetClass,
  onSetPeriod,
  onSetSaturday,
}: {
  timetable: Timetable
  /** 今日の曜日（0=日〜6=土）。今日の列の見出しに枠を付ける */
  todayWeekday: number
  onSetClass: (weekday: number, period: number, slot: ClassSlot | null) => void
  onSetPeriod: (period: number, time: Period) => void
  onSetSaturday: (on: boolean) => void
}) {
  const [editing, setEditing] = useState<Editing | null>(null)
  // 閉じるアニメーションの間も中身を残すため、最後に開いたものを覚えておく
  const [last, setLast] = useState<Editing | null>(null)
  const open = (e: Editing) => {
    setEditing(e)
    setLast(e)
  }
  const close = () => setEditing(null)

  const days = timetable.saturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]
  const periods = Array.from({ length: PERIOD_COUNT }, (_, i) => i + 1)

  const sheetTitle = !last
    ? ''
    : last.kind === 'class'
      ? `${WEEKDAYS[last.weekday]}曜 ${last.period}限`
      : `${last.period}限の時間`

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="時間割の表" className="ui-card p-2">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `40px repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <span aria-hidden />
          {days.map((w) => (
            <span
              key={w}
              className={`flex h-8 items-center justify-center rounded-xl text-xs font-bold ${
                w === todayWeekday ? 'text-ink ring-2 ring-ink ring-inset' : 'text-ink-muted'
              }`}
            >
              {WEEKDAYS[w]}
              {w === todayWeekday && <span className="sr-only">（今日）</span>}
            </span>
          ))}

          {periods.map((p) => {
            const time = timetable.periods[p - 1]
            return [
              <button
                key={`p${p}`}
                type="button"
                onClick={() => open({ kind: 'period', period: p })}
                aria-label={`${p}限 ${time.start}〜${time.end}の時刻を変える`}
                className="flex min-h-16 flex-col items-center justify-center rounded-xl text-ink transition hover:bg-paper"
              >
                <span className="text-base leading-none font-bold tabular-nums">{p}</span>
                <span className="mt-1 text-xs leading-none text-ink-muted tabular-nums">
                  {time.start}
                </span>
              </button>,
              ...days.map((w) => {
                const slot = timetable.classes[slotKey(w, p)]
                return (
                  <button
                    key={`${w}-${p}`}
                    type="button"
                    onClick={() => open({ kind: 'class', weekday: w, period: p })}
                    aria-label={`${WEEKDAYS[w]}曜 ${p}限 ${slot ? `${slot.name}${slot.room ? ` ${slot.room}` : ''}` : '空き'}`}
                    className={`flex min-h-16 min-w-0 flex-col justify-center overflow-hidden rounded-xl p-1 text-left transition ${
                      slot
                        ? 'border border-line-strong bg-surface hover:bg-paper'
                        : 'border border-dashed border-line bg-paper hover:bg-surface'
                    }`}
                  >
                    {slot && (
                      <>
                        <span className="line-clamp-3 text-xs leading-4 font-bold break-all text-ink">
                          {slot.name}
                        </span>
                        {slot.room && (
                          <span className="truncate text-xs leading-4 text-ink-muted">
                            {slot.room}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              }),
            ]
          })}
        </div>
      </section>

      <Group>
        <SwitchRow
          label="土曜日も授業がある"
          on={timetable.saturday}
          onToggle={() => onSetSaturday(!timetable.saturday)}
        />
      </Group>

      <Sheet
        open={editing !== null}
        title={sheetTitle}
        onClose={close}
        focusFirstInput={last?.kind === 'class'}
      >
        {last?.kind === 'class' && (
          <ClassForm
            key={`${last.weekday}-${last.period}`}
            slot={timetable.classes[slotKey(last.weekday, last.period)]}
            onSave={(slot) => {
              onSetClass(last.weekday, last.period, slot)
              close()
            }}
            onClear={() => {
              onSetClass(last.weekday, last.period, null)
              close()
            }}
          />
        )}
        {last?.kind === 'period' && (
          <PeriodForm
            key={`p${last.period}`}
            time={timetable.periods[last.period - 1]}
            onSave={(time) => {
              onSetPeriod(last.period, time)
              close()
            }}
          />
        )}
      </Sheet>
    </div>
  )
}
