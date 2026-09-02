import type { AppDataExport } from '../types'

/** Parses and shape-checks an imported backup file, throwing a readable message if it's not one. */
export function parseAppDataExport(raw: string): AppDataExport {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('That file does not look like a DayPlan backup.')
  }

  const d = data as Record<string, unknown>

  if (d.version !== 1) {
    throw new Error('That file does not look like a DayPlan backup.')
  }
  if (!Array.isArray(d.profiles) || d.profiles.some((p) => typeof p !== 'object' || p === null)) {
    throw new Error('The backup is missing its profiles.')
  }
  if (typeof d.defaultProfileId !== 'string') {
    throw new Error('The backup is missing its default profile.')
  }
  if (typeof d.dayMapping !== 'object' || d.dayMapping === null) {
    throw new Error('The backup is missing its weekly schedule.')
  }
  if (!Array.isArray(d.dayStates)) {
    throw new Error('The backup is missing its day history.')
  }

  return d as unknown as AppDataExport
}
