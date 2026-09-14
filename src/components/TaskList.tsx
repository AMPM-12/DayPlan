import { useEffect, useRef, useState } from 'react'
import type { PlanTask } from '../types'
import { formatDuration } from '../utils/time'

const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8
// Auto-scroll the page while dragging near the top/bottom edge of the
// viewport — without this, any row currently off-screen (a task list long
// enough to require scrolling) is an unreachable drop target, since
// nothing else scrolls the list for you mid-drag. Mirrors ActivityList's
// fix — same context (a plain scrolling page), so the same approach applies directly.
const AUTO_SCROLL_EDGE_PX = 72
const AUTO_SCROLL_MAX_PX_PER_FRAME = 18

interface Rect {
  id: string
  /** Document-relative (viewport top + scrollY at snapshot time), so it stays valid across any scrolling — including the auto-scroll below — that happens during the drag. */
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
  /** window.scrollY at drag start — needed to convert the dragged row's document-relative rect back to a viewport-relative position for the floating ghost. */
  startScrollY: number
}

/** `pointerDocumentY` must be document-relative (viewport Y + window.scrollY), matching `rects[].top`. */
function computeTargetIndex(rects: Rect[], draggedId: string, pointerDocumentY: number): number {
  const others = rects.filter((r) => r.id !== draggedId)
  let index = 0
  for (const r of others) {
    if (pointerDocumentY > r.top + r.height / 2) index++
  }
  return index
}

/**
 * The standalone Task List — quick-add, inline edit (title/estimate/spent),
 * complete toggle, delete, and long-press drag-reorder. Interaction pattern
 * (long-press threshold, pointer tracking, ghost row) mirrors DocketEditor/
 * ActivityList verbatim; kept as its own copy rather than a shared hook,
 * matching how those two already relate to each other in this codebase.
 */
export function TaskList({
  tasks,
  onAdd,
  onUpdate,
  onDelete,
  onToggleComplete,
  onReorder,
}: {
  tasks: PlanTask[]
  onAdd: (title: string, estimatedMinutes: number) => void
  onUpdate: (task: PlanTask) => void
  onDelete: (id: string) => void
  onToggleComplete: (id: string) => void
  onReorder: (ordered: PlanTask[]) => void
}) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(25)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editEstimate, setEditEstimate] = useState(0)
  const [editSpent, setEditSpent] = useState(0)

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
    onAdd(t, minutes)
    setTitle('')
  }

  function startEditing(task: PlanTask) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditEstimate(task.estimatedMinutes)
    setEditSpent(task.timeSpentMinutes)
  }

  function saveEdit() {
    const t = editTitle.trim()
    if (!t || editEstimate <= 0 || editSpent < 0 || !editingTaskId) return
    const original = tasks.find((task) => task.id === editingTaskId)
    if (!original) return
    onUpdate({
      ...original,
      title: t,
      estimatedMinutes: editEstimate,
      timeSpentMinutes: editSpent,
    })
    setEditingTaskId(null)
  }

  function snapshotRects(): Rect[] {
    const scrollY = window.scrollY
    return tasks.map((t) => {
      const el = rowRefs.current.get(t.id)
      const r = el?.getBoundingClientRect()
      return {
        id: t.id,
        top: (r?.top ?? 0) + scrollY,
        left: r?.left ?? 0,
        width: r?.width ?? 0,
        height: r?.height ?? 0,
      }
    })
  }

  function beginDrag(id: string, clientY: number) {
    suppressClick.current = true
    setDrag({ id, startY: clientY, currentY: clientY, rects: snapshotRects(), startScrollY: window.scrollY })
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pressStart.current = null
  }

  function handleRowPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    if (editingTaskId) return
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

  function handleRowClick(task: PlanTask) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    startEditing(task)
  }

  function handleHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.preventDefault()
    e.stopPropagation()
    beginDrag(id, e.clientY)
  }

  // Window-level listeners own move/commit for the duration of a drag — same
  // pattern as DocketEditor/ActivityList (see their own comments).
  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      setDrag((d) => (d ? { ...d, currentY: e.clientY } : d))
    }

    function onUp(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return null
        const targetIndex = computeTargetIndex(d.rects, d.id, e.clientY + window.scrollY)
        const current = tasksRef.current
        const fromIndex = current.findIndex((t) => t.id === d.id)
        const reordered = [...current]
        const [moved] = reordered.splice(fromIndex, 1)
        reordered.splice(targetIndex, 0, moved)
        if (reordered.some((t, i) => t.id !== current[i]?.id)) {
          onReorder(reordered)
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

  // Runs alongside the listeners above for the same drag: on every frame,
  // scroll the page when the pointer sits near the top/bottom edge of the
  // viewport, faster the closer it is to the edge. Forces a re-render each
  // scrolling frame (an otherwise-unused field bump) so the target-index
  // indicator stays in sync with the list moving underneath the pointer —
  // window.scrollBy alone doesn't trigger React to recompute it.
  useEffect(() => {
    if (!drag) return
    let rafId: number

    function tick() {
      setDrag((d) => {
        if (!d) return d
        const vh = window.innerHeight
        let delta = 0
        if (d.currentY < AUTO_SCROLL_EDGE_PX) {
          delta = -Math.ceil(((AUTO_SCROLL_EDGE_PX - d.currentY) / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX_PER_FRAME)
        } else if (d.currentY > vh - AUTO_SCROLL_EDGE_PX) {
          delta = Math.ceil(
            ((d.currentY - (vh - AUTO_SCROLL_EDGE_PX)) / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX_PER_FRAME,
          )
        }
        if (delta === 0) return d
        const before = window.scrollY
        window.scrollBy(0, delta)
        // Reached the top/bottom of the page — nothing actually moved, so
        // don't force a render (computeTargetIndex's result can't have changed).
        if (window.scrollY === before) return d
        return { ...d }
      })
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id])

  const targetIndex = drag ? computeTargetIndex(drag.rects, drag.id, drag.currentY + window.scrollY) : null
  const others = drag ? tasks.filter((t) => t.id !== drag.id) : tasks
  const draggedTask = drag ? tasks.find((t) => t.id === drag.id) : undefined
  const draggedRect = drag ? drag.rects.find((r) => r.id === drag.id) : undefined

  return (
    <div className="space-y-2">
      <div className="relative space-y-2">
        {others.length === 0 && !drag && (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:text-slate-500 dark:ring-white/5">
            No tasks yet — add one below.
          </p>
        )}
        {others.map((task, i) => {
          const remaining = task.estimatedMinutes - task.timeSpentMinutes
          const isOver = remaining < 0
          const pct =
            task.estimatedMinutes > 0
              ? Math.min(100, (task.timeSpentMinutes / task.estimatedMinutes) * 100)
              : 0

          return (
            <div key={task.id}>
              {drag && i === targetIndex && (
                <div className="mb-2 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
              )}
              {editingTaskId === task.id ? (
                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    placeholder="Task title"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <div className="flex gap-3">
                    <label className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Estimate (min)
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={editEstimate}
                        onChange={(e) => setEditEstimate(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>
                    <label className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Spent (min)
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={editSpent}
                        onChange={(e) => setEditSpent(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(task.id)
                        setEditingTaskId(null)
                      }}
                      className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTaskId(null)}
                      className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
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
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5"
                >
                  <button
                    type="button"
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleComplete(task.id)
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                      task.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-transparent dark:border-slate-600'
                    }`}
                  >
                    ✓
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-medium text-slate-800 dark:text-slate-100 ${
                        task.completed ? 'line-through decoration-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Est {formatDuration(task.estimatedMinutes)} · Spent{' '}
                      {formatDuration(task.timeSpentMinutes)} ·{' '}
                      {isOver ? (
                        <span className="font-medium text-red-500 dark:text-red-400">
                          +{Math.abs(remaining)} min over
                        </span>
                      ) : (
                        `${formatDuration(remaining)} left`
                      )}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-red-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${isOver ? 100 : pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => handleHandlePointerDown(e, task.id)}
                    className="shrink-0 touch-none rounded-lg p-2 text-slate-300 dark:text-slate-600"
                  >
                    ⠿
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {drag && targetIndex === others.length && (
          <div className="h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
        )}

        {drag && draggedTask && draggedRect && (
          <div
            style={{
              position: 'fixed',
              // draggedRect.top is document-relative; convert back to
              // viewport-relative (via the scroll position at drag start)
              // before adding the pointer's own movement delta.
              top: draggedRect.top - drag.startScrollY + (drag.currentY - drag.startY),
              left: draggedRect.left,
              width: draggedRect.width,
              zIndex: 50,
              pointerEvents: 'none',
            }}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-xl ring-1 ring-indigo-300 dark:bg-slate-800 dark:ring-indigo-500/50"
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                draggedTask.completed
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 text-transparent dark:border-slate-600'
              }`}
            >
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">{draggedTask.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Est {formatDuration(draggedTask.estimatedMinutes)}
              </p>
            </div>
            <span className="shrink-0 p-2 text-slate-300 dark:text-slate-600">⠿</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
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
          placeholder="Add a task"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Estimated minutes"
          className="w-16 shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={addTask}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Add
        </button>
      </div>
    </div>
  )
}
