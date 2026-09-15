import { useEffect, useRef, useState } from 'react'
import type { Activity } from '../types'
import { formatClock, formatDuration, parseTimeToMinutes } from '../utils/time'
import { CategoryDot } from './CategoryTag'
import { logDragDebug } from '../utils/dragDebug' // TEMPORARY — see src/utils/dragDebug.ts

const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8
// Auto-scroll the page while dragging near the top/bottom edge of the
// viewport — without this, any row currently off-screen (common once the
// list is longer than one screenful) is an unreachable drop target, since
// nothing else scrolls the list for you mid-drag.
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

export function ActivityList({
  activities,
  onEdit,
  onReorder,
}: {
  activities: Activity[]
  onEdit: (activity: Activity) => void
  onReorder: (ordered: Activity[]) => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number; id: string } | null>(null)
  const suppressClick = useRef(false)
  const activitiesRef = useRef(activities)
  activitiesRef.current = activities

  function snapshotRects(): Rect[] {
    const scrollY = window.scrollY
    const missingRefs: string[] = []
    const rects = activities.map((a) => {
      const el = rowRefs.current.get(a.id)
      const r = el?.getBoundingClientRect()
      if (!el) missingRefs.push(a.id.slice(0, 8))
      return {
        id: a.id,
        top: (r?.top ?? 0) + scrollY,
        left: r?.left ?? 0,
        width: r?.width ?? 0,
        height: r?.height ?? 0,
      }
    })
    logDragDebug(
      `activity/snapshotRects rows=${rects.length} missingRefs=${missingRefs.length ? missingRefs.join(',') : 'none'} scrollY=${Math.round(scrollY)}`,
    )
    return rects
  }

  function beginDrag(id: string, clientY: number) {
    logDragDebug(`activity/beginDrag id=${id.slice(0, 8)} clientY=${Math.round(clientY)} scrollY=${Math.round(window.scrollY)}`)
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
    logDragDebug(`activity/row.onPointerDown id=${id.slice(0, 8)} type=${e.pointerType} clientY=${Math.round(e.clientY)}`)
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
      logDragDebug(`activity/row.longPressTimer fired id=${id.slice(0, 8)}`)
      beginDrag(p.id, p.y)
    }, LONG_PRESS_MS)
  }

  function handleRowPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (drag || !pressStart.current) return
    const dx = e.clientX - pressStart.current.x
    const dy = e.clientY - pressStart.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      logDragDebug(`activity/row.onPointerMove CANCELLED longPress dx=${Math.round(dx)} dy=${Math.round(dy)}`)
      clearLongPress()
    }
  }

  function handleRowPointerUpOrCancel(e: React.PointerEvent<HTMLDivElement>) {
    logDragDebug(`activity/row.${e.type} id=${pressStart.current?.id?.slice(0, 8) ?? '—'}`)
    clearLongPress()
  }

  function handleRowClick(activity: Activity) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onEdit(activity)
  }

  function handleHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    logDragDebug(`activity/handle.onPointerDown id=${id.slice(0, 8)} type=${e.pointerType} clientY=${Math.round(e.clientY)} scrollY=${Math.round(window.scrollY)}`)
    e.preventDefault()
    e.stopPropagation()
    beginDrag(id, e.clientY)
  }

  // Window-level listeners own move/commit for the duration of a drag —
  // robust even if pointer capture is lost or the pointer ends up outside
  // any row (e.g. dragged above the top of the list).
  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      setDrag((d) => (d ? { ...d, currentY: e.clientY } : d))
    }

    function onUp(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return null
        const targetIndex = computeTargetIndex(d.rects, d.id, e.clientY + window.scrollY)
        const current = activitiesRef.current
        const fromIndex = current.findIndex((a) => a.id === d.id)
        const reordered = [...current]
        const [moved] = reordered.splice(fromIndex, 1)
        reordered.splice(targetIndex, 0, moved)
        if (reordered.some((a, i) => a.id !== current[i]?.id)) {
          onReorder(reordered)
        }
        return null
      })
      // A real drag gesture generally doesn't fire a trailing click, so don't
      // leave the flag latched forever — but clear it a tick late in case one does.
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
  const others = drag ? activities.filter((a) => a.id !== drag.id) : activities
  const draggedActivity = drag ? activities.find((a) => a.id === drag.id) : undefined
  const draggedRect = drag ? drag.rects.find((r) => r.id === drag.id) : undefined

  return (
    <div className="relative space-y-2">
      {others.map((activity, i) => (
        <div key={activity.id}>
          {drag && i === targetIndex && (
            <div className="mb-2 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
          )}
          <div
            ref={(el) => {
              if (el) rowRefs.current.set(activity.id, el)
              else rowRefs.current.delete(activity.id)
            }}
            data-drag-role="row"
            data-drag-list="activity"
            data-drag-index={activities.findIndex((a) => a.id === activity.id)}
            data-drag-id={activity.id}
            onPointerDown={(e) => handleRowPointerDown(e, activity.id)}
            onPointerMove={handleRowPointerMove}
            onPointerUp={handleRowPointerUpOrCancel}
            onPointerCancel={handleRowPointerUpOrCancel}
            onClick={() => handleRowClick(activity)}
            className="flex w-full items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5"
          >
            <div className="w-14 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {formatClock(parseTimeToMinutes(activity.startTime))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CategoryDot category={activity.category} />
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {activity.title}
                </p>
                {activity.isFlexible && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    Flexible
                  </span>
                )}
                {activity.isAwaken && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    ☀️ AWAKEN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatDuration(activity.durationMin)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Drag to reorder"
              data-drag-role="handle"
              data-drag-list="activity"
              data-drag-index={activities.findIndex((a) => a.id === activity.id)}
              data-drag-id={activity.id}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleHandlePointerDown(e, activity.id)}
              className="shrink-0 touch-none rounded-lg p-2 text-slate-300 dark:text-slate-600"
            >
              ⠿
            </button>
          </div>
        </div>
      ))}
      {drag && targetIndex === others.length && (
        <div className="h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
      )}

      {drag && draggedActivity && draggedRect && (
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
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-left shadow-xl ring-1 ring-indigo-300 dark:bg-slate-800 dark:ring-indigo-500/50"
        >
          <div className="w-14 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatClock(parseTimeToMinutes(draggedActivity.startTime))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CategoryDot category={draggedActivity.category} />
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                {draggedActivity.title}
              </p>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatDuration(draggedActivity.durationMin)}
            </p>
          </div>
          <span className="shrink-0 p-2 text-slate-300 dark:text-slate-600">⠿</span>
        </div>
      )}
    </div>
  )
}
