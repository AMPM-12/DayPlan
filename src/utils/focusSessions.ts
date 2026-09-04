import type { Activity } from '../types'

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
