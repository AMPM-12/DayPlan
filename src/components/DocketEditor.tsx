import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { DocketTask, PlanTask } from '../types'
import { formatDuration } from '../utils/time'
import { remainingMinutesForPlanTask, resolveDocketTaskTitle } from '../utils/focusSessions'

const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8
// Auto-scroll while dragging near the top/bottom edge of whatever scrolls
// this list — without this, any row currently off-screen (a docket long
// enough to require scrolling) is an unreachable drop target, since
// nothing else scrolls the list for you mid-drag. Mirrors ActivityList's
// fix, generalized: DocketEditor renders both directly on a page (which
// scrolls via the window, e.g. inside FocusSessionsScreen's SessionCard)
// and inside a Sheet (which scrolls via its own capped overflow-y-auto
// div, e.g. the "Edit upcoming tasks" flow) — see findScrollContainer.
const AUTO_SCROLL_EDGE_PX = 72
const AUTO_SCROLL_MAX_PX_PER_FRAME = 18

interface Rect {
  id: string
  /** Relative to the drag's scroll container's own scrollable content (viewport top - container's viewport top + container's scrollTop, all at snapshot time) — stays valid across any scrolling, including the auto-scroll below, that happens during the drag. */
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
  /** The container's scrollTop at drag start — needed to convert the dragged row's container-relative rect back to a viewport-relative position for the floating ghost. */
  startScrollTop: number
}

/** `pointerContainerY` must be in the same container-relative space as `rects[].top` — see `toContainerSpace`. */
function computeTargetIndex(rects: Rect[], draggedId: string, pointerContainerY: number): number {
  const others = rects.filter((r) => r.id !== draggedId)
  let index = 0
  for (const r of others) {
    if (pointerContainerY > r.top + r.height / 2) index++
  }
  return index
}

/**
 * The nearest scrollable ancestor of `el` — e.g. a Sheet's own
 * overflow-y-auto div — or the page's own scrolling element when there
 * isn't one (DocketEditor renders in both contexts; this makes the same
 * drag code work for either without knowing which it's in).
 */
function findScrollContainer(el: Element | null): Element {
  let node = el?.parentElement ?? null
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return document.scrollingElement ?? document.documentElement
}

/** Converts a viewport-relative Y (e.g. from a pointer event) into `container`'s content-relative space, matching how `snapshotRects` measures rows. */
function toContainerSpace(container: Element, clientY: number): number {
  return clientY - container.getBoundingClientRect().top + container.scrollTop
}

/** The container's own on-screen top/bottom edges — where auto-scroll's edge zones live. A plain page (scrolling via the document) uses the viewport itself, since the scrolling element's own rect isn't a reliable stand-in for it across browsers. */
function containerViewportBounds(container: Element): { top: number; bottom: number } {
  if (container === document.documentElement || container === document.body) {
    return { top: 0, bottom: window.innerHeight }
  }
  const r = container.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom }
}

export function DocketEditor({
  tasks,
  planTasks,
  onChange,
  allowEdit,
}: {
  tasks: DocketTask[]
  /**
   * The household's standalone Task List — read-only here, used only to
   * resolve a linked entry's live title (resolveDocketTaskTitle) and to
   * power "Add from Tasks". Never mutated from this component; selecting
   * or removing a linked docket entry never touches a PlanTask.
   */
  planTasks: PlanTask[]
  onChange: (tasks: DocketTask[]) => void
  allowEdit: boolean
}) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [pickerOpen, setPickerOpen] = useState(false)

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
  // Resolved once per drag (in beginDrag) from whichever row is on hand —
  // stable for the drag's duration since neither a Sheet nor the page
  // itself moves out from under its own scroll.
  const scrollContainerRef = useRef<Element | null>(null)

  function addTask() {
    const t = title.trim()
    if (!t || minutes <= 0) return
    onChange([...tasks, { id: uuid(), title: t, plannedMinutes: minutes, status: 'planned' }])
    setTitle('')
  }

  // plannedMinutes is only ever a SEED from the task's current remaining
  // time (estimatedMinutes - timeSpentMinutes) — a one-time default for
  // this session's own plan, never re-derived or kept in sync afterward;
  // the household can freely edit it right after adding, same as any
  // free-text entry's minutes.
  function addFromTask(planTask: PlanTask) {
    onChange([
      ...tasks,
      {
        id: uuid(),
        title: planTask.title,
        plannedMinutes: remainingMinutesForPlanTask(planTask),
        status: 'planned',
        taskId: planTask.id,
      },
    ])
    // Deliberately left open — the "+ Add from Tasks" / "Close" toggle below
    // is the explicit dismiss control, so several tasks can be added in a
    // row without reopening the picker each time.
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
    if (editMinutes <= 0 || !editingTaskId) return
    const editing = tasks.find((t) => t.id === editingTaskId)
    if (!editing) return
    if (editing.taskId) {
      // Linked entry: title isn't editable here at all (it always tracks
      // the live PlanTask — see resolveDocketTaskTitle) — only its
      // per-session plannedMinutes.
      onChange(
        tasks.map((t) => (t.id === editingTaskId ? { ...t, plannedMinutes: editMinutes } : t)),
      )
    } else {
      const t = editTitle.trim()
      if (!t) return
      onChange(
        tasks.map((task) =>
          task.id === editingTaskId ? { ...task, title: t, plannedMinutes: editMinutes } : task,
        ),
      )
    }
    setEditingTaskId(null)
  }

  function snapshotRects(): Rect[] {
    const anyRow = rowRefs.current.values().next().value ?? null
    const container = findScrollContainer(anyRow)
    scrollContainerRef.current = container
    const containerTop = container.getBoundingClientRect().top
    const scrollTop = container.scrollTop
    return tasks.map((t) => {
      const el = rowRefs.current.get(t.id)
      const r = el?.getBoundingClientRect()
      return {
        id: t.id,
        top: r ? r.top - containerTop + scrollTop : 0,
        left: r?.left ?? 0,
        width: r?.width ?? 0,
        height: r?.height ?? 0,
      }
    })
  }

  function beginDrag(id: string, clientY: number) {
    suppressClick.current = true
    const rects = snapshotRects()
    setDrag({
      id,
      startY: clientY,
      currentY: clientY,
      rects,
      startScrollTop: scrollContainerRef.current?.scrollTop ?? 0,
    })
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pressStart.current = null
  }

  function handleRowPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    // HYPOTHESIS FIX, deliberately reproduced — do not remove without
    // re-testing on a real touchscreen. Touch drag-start worked reliably at
    // every list length while temporary debug logging sat at the top of
    // this handler; it broke again at the same "screenful" threshold the
    // moment that logging-only code was removed (confirmed via diff that
    // nothing else changed — no drag/scroll logic was touched). The one
    // thing that logging had in common with this line is a small amount of
    // synchronous work executed before anything else runs. This forces a
    // layout read (result discarded) to reproduce that side effect on
    // purpose: if it holds up, the native touch/scroll gesture arbitration
    // is apparently sensitive to whether a layout flush happens
    // synchronously at pointerdown, not to anything about our drag logic.
    e.currentTarget.getBoundingClientRect()
    if (!allowEdit || editingTaskId) return
    // Touch only ever drags via the handle below (already touch-action:
    // none and committed instantly, with no delay for a competing native
    // scroll gesture to win). The row-wide long-press here waits 350ms
    // before doing anything, which on a real touchscreen — especially once
    // the list has already been scrolled — loses that race to the browser's
    // own scroll-gesture arbitration and gets silently cancelled before the
    // timer ever fires. Mouse/pen have no such race, so they keep it.
    if (e.pointerType === 'touch') return
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
    // HYPOTHESIS FIX — see the matching comment in handleRowPointerDown above.
    e.currentTarget.getBoundingClientRect()
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
        const container = scrollContainerRef.current
        const pointerY = container ? toContainerSpace(container, e.clientY) : e.clientY
        const targetIndex = computeTargetIndex(d.rects, d.id, pointerY)
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

  // Runs alongside the listeners above for the same drag: on every frame,
  // scroll the container when the pointer sits near its top/bottom edge,
  // faster the closer it is to the edge. Forces a re-render each scrolling
  // frame (an otherwise-unused field bump) so the target-index indicator
  // stays in sync with the list moving underneath the pointer — scrollBy
  // alone doesn't trigger React to recompute it.
  useEffect(() => {
    if (!drag) return
    const container = scrollContainerRef.current
    if (!container) return
    let rafId: number

    function tick() {
      setDrag((d) => {
        if (!d) return d
        const { top, bottom } = containerViewportBounds(container!)
        let delta = 0
        if (d.currentY < top + AUTO_SCROLL_EDGE_PX) {
          delta = -Math.ceil(((top + AUTO_SCROLL_EDGE_PX - d.currentY) / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX_PER_FRAME)
        } else if (d.currentY > bottom - AUTO_SCROLL_EDGE_PX) {
          delta = Math.ceil(
            ((d.currentY - (bottom - AUTO_SCROLL_EDGE_PX)) / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX_PER_FRAME,
          )
        }
        if (delta === 0) return d
        const before = container!.scrollTop
        container!.scrollBy(0, delta)
        // Reached the top/bottom of the container — nothing actually
        // moved, so don't force a render (computeTargetIndex can't have changed).
        if (container!.scrollTop === before) return d
        return { ...d }
      })
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id])

  const targetIndex =
    drag && scrollContainerRef.current
      ? computeTargetIndex(drag.rects, drag.id, toContainerSpace(scrollContainerRef.current, drag.currentY))
      : null
  const others = drag ? tasks.filter((t) => t.id !== drag.id) : tasks
  const draggedTask = drag ? tasks.find((t) => t.id === drag.id) : undefined
  const draggedRect = drag ? drag.rects.find((r) => r.id === drag.id) : undefined
  const draggedContainerTop = scrollContainerRef.current?.getBoundingClientRect().top ?? 0
  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : undefined
  // "Add from Tasks" only ever offers open work not already in this docket
  // — the open-work half mirrors the Task List's own "Clear completed"
  // reasoning (never plan a session around something already finished);
  // the already-added half matters now that the picker stays open after
  // each pick, so the same task can't be added twice by mistake.
  const linkedTaskIds = new Set(tasks.map((t) => t.taskId).filter((id): id is string => !!id))
  const incompletePlanTasks = planTasks.filter((t) => !t.completed && !linkedTaskIds.has(t.id))

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
                {editingTask?.taskId ? (
                  <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {resolveDocketTaskTitle(editingTask, planTasks)}
                    <span className="ml-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-400">
                      (from Tasks — rename it there)
                    </span>
                  </p>
                ) : (
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
                )}
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
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span className="truncate">{resolveDocketTaskTitle(task, planTasks)}</span>
                    {task.taskId && (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        ✅ Task
                      </span>
                    )}
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
              // draggedRect.top is container-relative; convert back to
              // viewport-relative (via the container's scroll position at
              // drag start, plus its own on-screen offset) before adding
              // the pointer's own movement delta.
              top: draggedRect.top - drag.startScrollTop + draggedContainerTop + (drag.currentY - drag.startY),
              left: draggedRect.left,
              width: draggedRect.width,
              zIndex: 50,
              pointerEvents: 'none',
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-indigo-300 dark:bg-slate-800 dark:ring-indigo-500/50"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="truncate">{resolveDocketTaskTitle(draggedTask, planTasks)}</span>
                {draggedTask.taskId && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    ✅ Task
                  </span>
                )}
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

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        className="w-full rounded-xl py-2 text-center text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        {pickerOpen ? 'Close' : '+ Add from Tasks'}
      </button>

      {pickerOpen && (
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          {incompletePlanTasks.length === 0 ? (
            <p className="px-2 py-1.5 text-center text-xs text-slate-400 dark:text-slate-500">
              No open tasks — add some in the Tasks tab first.
            </p>
          ) : (
            incompletePlanTasks.map((pt) => {
              const remaining = remainingMinutesForPlanTask(pt)
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => addFromTask(pt)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 text-left text-sm dark:bg-slate-800"
                >
                  <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                    {pt.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatDuration(remaining)} left
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
