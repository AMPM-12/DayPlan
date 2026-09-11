import type { Activity, DocketTask, PlanTask } from '../types'

/**
 * A date's focus-session activities in the same chronological order the
 * Focus Sessions tab displays them in — the single source of truth for
 * "Session N" numbering, shared by every screen that needs to show it.
 */
export function sortFocusSessions(activities: Activity[]): Activity[] {
  return activities
    .filter((a) => a.isFocusSession)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** activityId -> 1-based "Session N" number, per sortFocusSessions' order. */
export function focusSessionNumbers(activities: Activity[]): Map<string, number> {
  return new Map(sortFocusSessions(activities).map((a, i) => [a.id, i + 1]))
}

/**
 * The title to actually display for a docket entry — every render site
 * across Focus Sessions (docket editor, live countdown, upcoming list,
 * log form) should call this instead of reading task.title directly, so
 * a linked entry (taskId set) always reflects the Task List's current
 * name for it. Falls back to the entry's own stored title if the linked
 * PlanTask no longer exists (deleted from the Task List) — a dangling
 * link degrades to its last-known snapshot rather than showing nothing.
 */
export function resolveDocketTaskTitle(task: DocketTask, planTasks: PlanTask[]): string {
  if (!task.taskId) return task.title
  return planTasks.find((t) => t.id === task.taskId)?.title ?? task.title
}

/**
 * What "Add from Tasks" seeds plannedMinutes with — a sensible per-session
 * default the household can still edit, NOT a value that's ever persisted
 * back onto the PlanTask itself. Floored at 1 (same minimum DocketEditor's
 * own free-text add already enforces) rather than letting an
 * already-over-budget task seed a zero or negative planned duration.
 */
export function remainingMinutesForPlanTask(task: PlanTask): number {
  return Math.max(1, task.estimatedMinutes - task.timeSpentMinutes)
}
