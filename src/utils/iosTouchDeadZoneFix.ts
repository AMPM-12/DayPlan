// A capture-phase `pointerdown` listener on `document`, registered once at
// app startup, that does nothing at all.
//
// Why this exists: rows in ActivityList/TaskList/DocketEditor stopped
// responding to touch past a "first screenful" threshold — visible, correctly
// positioned, but the drag never started. Two rounds of drag-logic changes
// (touch-action gating, a forced synchronous layout read, will-change on
// rows/handles/the Sheet container) each shifted or partially affected the
// symptom without resolving it. A temporary on-screen debug overlay was
// added to get real device data, and confirmed on a real iPhone that the
// previously-broken rows worked correctly the entire time debug mode was
// on — with nothing else different. The overlay's one side effect that
// wasn't itself removed for this test is exactly this: a capture-phase
// pointerdown listener on `document`. This file isolates that single
// variable, with everything else (the overlay, per-row logging, the forced
// layout read, will-change) stripped back out, to find out whether the
// listener ALONE reproduces the fix — which would point to iOS Safari's own
// touch/scroll gesture arbitration being sensitive to the mere presence of
// a capture-phase listener, independent of what it does.
//
// Do not remove without re-testing on a real touchscreen at the same row
// thresholds (Task List, Focus Sessions docket, Activity Editor).
export function installIosTouchDeadZoneFix() {
  document.addEventListener('pointerdown', () => {}, { capture: true })
}
