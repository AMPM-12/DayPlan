import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { DocketTask } from '../types'
import { formatDuration } from '../utils/time'

export function DocketEditor({
  tasks,
  onChange,
  allowEdit,
}: {
  tasks: DocketTask[]
  onChange: (tasks: DocketTask[]) => void
  allowEdit: boolean
}) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(25)

  function addTask() {
    const t = title.trim()
    if (!t || minutes <= 0) return
    onChange([...tasks, { id: uuid(), title: t, plannedMinutes: minutes, status: 'planned' }])
    setTitle('')
  }

  function removeTask(id: string) {
    onChange(tasks.filter((t) => t.id !== id))
  }

  function moveTask(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= tasks.length) return
    const next = [...tasks]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {task.title}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatDuration(task.plannedMinutes)}
            </p>
          </div>
          {allowEdit && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveTask(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="rounded-lg p-1.5 text-slate-400 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveTask(i, 1)}
                disabled={i === tasks.length - 1}
                aria-label="Move down"
                className="rounded-lg p-1.5 text-slate-400 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                aria-label="Remove task"
                className="rounded-lg p-1.5 text-slate-400"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTask()
            }
          }}
          placeholder="Task title"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-16 shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={addTask}
          className="shrink-0 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Add
        </button>
      </div>
    </div>
  )
}
