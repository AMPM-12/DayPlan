// TEMPORARY diagnostic instrumentation for the drag-and-drop-fails-past-a-
// row-threshold investigation. Safe to delete entirely once that's solved —
// nothing here is load-bearing for the app. Enabled only by adding
// ?dragdebug=1 to the URL once (persists via localStorage after that), or by
// calling setDragDebugEnabled(true) from the console.
//
// Two layers of logging feed the same on-screen overlay:
// 1. A capture-phase `pointerdown` listener on `document` itself, added
//    below, whenever debug mode is on. Capture-phase on the outermost
//    ancestor means it always fires first, before any deeper element's
//    stopPropagation() can run — so an entry here is ground truth that the
//    browser delivered a pointerdown to the DOM at all, and exactly what
//    element it landed on. If a press "does nothing," this tells us whether
//    the browser saw it land on our row/handle, or on something else
//    entirely (an overlay, a fixed nav bar, anything unexpected).
// 2. Explicit logDragDebug() calls placed inside ActivityList/TaskList/
//    DocketEditor's own pointer handlers, tagged with which component they
//    came from. Comparing these against (1) tells us whether OUR handler
//    ran at all for a given press, vs the raw event reaching the DOM fine
//    but something in React's dispatch (or our own early-return logic)
//    stopping it before it did anything.

const ENABLED_KEY = 'dailyplan.dragDebug.v1'
const MAX_ENTRIES = 80

export interface DragDebugEntry {
  time: string
  msg: string
}

let entries: DragDebugEntry[] = []
const listeners = new Set<() => void>()
let rawListenerAttached = false

function notify() {
  listeners.forEach((l) => l())
}

export function isDragDebugEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

function nowStamp(): string {
  return new Date().toISOString().slice(11, 23)
}

export function logDragDebug(msg: string) {
  if (!isDragDebugEnabled()) return
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { time: nowStamp(), msg }]
  notify()
}

export function clearDragDebugEntries() {
  entries = []
  notify()
}

export function getDragDebugEntries(): DragDebugEntry[] {
  return entries
}

export function subscribeDragDebug(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Short, readable description of a raw event target for the ground-truth log — deliberately generic so it identifies things we did NOT expect (a nav bar, a backdrop) just as well as things we did. */
function describeElement(el: Element | null): string {
  if (!el) return '(none)'
  const tagged = el.closest('[data-drag-role]') as HTMLElement | null
  if (tagged) {
    const { dragRole, dragList, dragIndex, dragId } = tagged.dataset
    return `${dragList}/${dragRole}#${dragIndex}(${dragId?.slice(0, 8)})`
  }
  const tag = el.tagName.toLowerCase()
  const cls = typeof el.className === 'string' ? el.className : ''
  const ariaLabel = el.getAttribute('aria-label')
  const shortClass = cls.split(' ').slice(0, 3).join('.')
  return `<${tag}${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}${shortClass ? ` class="${shortClass}…"` : ''}>`
}

function attachRawListener() {
  if (rawListenerAttached) return
  rawListenerAttached = true
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!isDragDebugEnabled()) return
      const target = e.target as Element | null
      logDragDebug(
        `RAW down type=${e.pointerType} target=${describeElement(target)} ` +
          `x=${Math.round(e.clientX)} y=${Math.round(e.clientY)} scrollY=${Math.round(window.scrollY)}`,
      )
    },
    { capture: true },
  )
}

export function setDragDebugEnabled(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem(ENABLED_KEY, '1')
      attachRawListener()
    } else {
      localStorage.removeItem(ENABLED_KEY)
    }
  } catch {
    // ignore storage failures (private browsing etc.) — debug mode just won't persist
  }
  notify()
}

// Auto-enable from a one-time URL flag, and re-attach the raw listener on
// every load if a previous session already turned debug mode on.
if (typeof window !== 'undefined') {
  if (window.location.href.includes('dragdebug=1')) {
    setDragDebugEnabled(true)
  }
  if (isDragDebugEnabled()) {
    attachRawListener()
  }
}
