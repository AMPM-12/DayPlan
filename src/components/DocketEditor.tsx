import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { DocketTask } from '../types'
import { formatDuration } from '../utils/time'

const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8

interface Rect {
  id: string
  top: number
  left: number
  width: number
  height: number
}

interface DragState {
  id: string
  startY: number
  currentY: number
  rects: Rect[]
}

function computeTargetIndex(rects: Rect[], draggedId: string, pointerY: number): number {
  const others = rects.filter((r) => r.id !== draggedId)
  let index = 0
  for (const r of others) {
    if (pointerY > r.top + r.height / 2) index++
  }
  return index
}

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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editMinutes, setEditMinutes] = useState(0)

  const [drag, setDrag] = useState<DragState | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number; id: string } | null>(null)
  const suppressClick = useRef(false)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  function addTask() {
    const t = title.trim()
    if (!t || minutes <= 0) return
    onChange([...tasks, { id: uuid(), title: t, plannedMinutes: minutes, status: 'planned' }])
    setTitle('')
  }

  function removeTask(id: string) {
    onChange(tasks.filter((t) => t.id !== id))
  }

  function startEditing(task: DocketTask) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditMinutes(task.plannedMinutes)
  }

  function saveEdit() {
    const t = editTitle.trim()
    if (!t || editMinutes <= 0 || !editingTaskId) return
    onChange(
      tasks.map((task) =>
        task.id === editingTaskId ? { ...task, title: t, plannedMinutes: editMinutes } : task,
      ),
    )
    setEditingTaskId(null)
  }

  function snapshotRects(): Rect[] {
    return tasks.map((t) => {
      const el = rowRefs.current.get(t.id)
      const r = el?.getBoundingClientRect()
      return { id: t.id, top: r?.top ?? 0, left: r?.left ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 }
    })
  }

  function beginDrag(id: string, clientY: number) {
    suppressClick.current = true
    setDrag({ id, startY: clientY, currentY: clientY, rects: snapshotRects() })
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pressStart.current = null
  }

  function handleRowPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    if (!allowEdit || editingTaskId) return
    pressStart.current = { x: e.clientX, y: e.clientY, id }
    longPressTimer.current = setTimeout(() => {
      const p = pressStart.current
      if (!p) return
      beginDrag(p.id, p.y)
    }, LONG_PRESS_MS)
  }

  function handleRowPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (drag || !pressStart.current) return
    const dx = e.clientX - pressStart.current.x
    const dy = e.clientY - pressStart.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearLongPress()
  }

  function handleRowPointerUpOrCancel() {
    clearLongPress()
  }

  function handleRowClick(task: DocketTask) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (allowEdit) startEditing(task)
  }

  function handleHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.preventDefault()
    e.stopPropagation()
    beginDrag(id, e.clientY)
  }

  // Window-level listeners own move/commit for the duration of a drag —
  // robust even if pointer capture is lost or the pointer ends up outside
  // any row (e.g. dragged above the top of the list). Mirrors the same
  // pattern used for reordering activities in the Plan screen.
  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      setDrag((d) => (d ? { ...d, currentY: e.clientY } : d))
    }

    function onUp(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return null
        const targetIndex = computeTargetIndex(d.rects, d.id, e.clientY)
        const current = tasksRef.current
        const fromIndex = current.findIndex((t) => t.id === d.id)
        const reordered = [...current]
        const [moved] = reordered.splice(fromIndex, 1)
        reordered.splice(targetIndex, 0, moved)
        if (reordered.some((t, i) => t.id !== current[i]?.id)) {
          onChange(reordered)
        }
        return null
      })
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }

    function onCancel() {
      setDrag(null)
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id])

  const targetIndex = drag ? computeTargetIndex(drag.rects, drag.id, drag.currentY) : null
  const others = drag ? tasks.filter((t) => t.id !== drag.id) : tasks
  const draggedTask = drag ? tasks.find((t) => t.id === drag.id) : undefined
  const draggedRect = drag ? drag.rects.find((r) => r.id === drag.id) : undefined

  return (
    <div className="space-y-2">
      <div className="relative space-y-2">
        {others.map((task, i) => (
          <div key={task.id}>
            {drag && i === targetIndex && (
              <div className="mb-2 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
            )}
            {editingTaskId === task.id ? (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveEdit()
                    }
                  }}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingTaskId(null)}
                    className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={(el) => {
                  if (el) rowRefs.current.set(task.id, el)
                  else rowRefs.current.delete(task.id)
                }}
                onPointerDown={(e) => handleRowPointerDown(e, task.id)}
                onPointerMove={handleRowPointerMove}
                onPointerUp={handleRowPointerUpOrCancel}
                onPointerCancel={handleRowPointerUpOrCancel}
                onClick={() => handleRowClick(task)}
                className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60 ${allowEdit ? 'cursor-pointer' : ''}`}
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
                      aria-label="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handleHandlePointerDown(e, task.id)}
                      className="touch-none rounded-lg p-1.5 text-slate-300 dark:text-slate-600"
                    >
                      ⠿
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTask(task.id)
                      }}
                      aria-label="Remove task"
                      className="rounded-lg p-1.5 text-slate-400"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {drag && targetIndex === others.length && (
          <div className="h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
        )}

        {drag && draggedTask && draggedRect && (
          <div
            style={{
              position: 'fixed',
              top: draggedRect.top + (drag.currentY - drag.startY),
              left: draggedRect.left,
              width: draggedRect.width,
              zIndex: 50,
              pointerEvents: 'none',
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-indigo-300 dark:bg-slate-800 dark:ring-indigo-500/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {draggedTask.title}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatDuration(draggedTask.plannedMinutes)}
              </p>
            </div>
            <span className="shrink-0 p-1.5 text-slate-300 dark:text-slate-600">⠿</span>
          </div>
        )}
      </div>

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
