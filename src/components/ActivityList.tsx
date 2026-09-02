import { useEffect, useRef, useState } from 'react'
import type { Activity } from '../types'
import { formatClock, formatDuration, parseTimeToMinutes } from '../utils/time'
import { CategoryDot } from './CategoryTag'

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
    return activities.map((a) => {
      const el = rowRefs.current.get(a.id)
      const r = el?.getBoundingClientRect()
      return { id: a.id, top: r?.top ?? 0, left: r?.left ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 }
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

  function handleRowClick(activity: Activity) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onEdit(activity)
  }

  function handleHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
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
        const targetIndex = computeTargetIndex(d.rects, d.id, e.clientY)
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

  const targetIndex = drag ? computeTargetIndex(drag.rects, drag.id, drag.currentY) : null
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
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatDuration(activity.durationMin)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Drag to reorder"
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
            top: draggedRect.top + (drag.currentY - drag.startY),
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
