import type { Activity, DayMapping, DayState, PlanProfile } from '../types'
import { weekdayOf } from './time'

/**
 * Which profile applies to a date: a per-date override, if set, else the
 * day-of-week mapping, else the default profile as a last resort.
 */
export function resolveProfileId(
  date: string,
  dayState: DayState | undefined,
  dayMapping: DayMapping,
  defaultProfileId: string,
): string {
  return dayState?.profileOverride ?? dayMapping[weekdayOf(date)] ?? defaultProfileId
}

/**
 * The activities that apply to a date. Returns the locked-in snapshot if one
 * exists (a date that has already occurred); otherwise resolves live.
 */
export function resolveActivities(
  date: string,
  dayState: DayState | undefined,
  profiles: PlanProfile[],
  dayMapping: DayMapping,
  defaultProfileId: string,
): Activity[] {
  if (dayState?.activitiesSnapshot) return dayState.activitiesSnapshot

  const profileId = resolveProfileId(date, dayState, dayMapping, defaultProfileId)
  const profile =
    profiles.find((p) => p.id === profileId) ?? profiles.find((p) => p.id === defaultProfileId)
  return profile?.activities ?? []
}
