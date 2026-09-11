import type { AwakenPracticeTemplate } from '../types'

export const DEFAULT_AWAKEN_PRACTICES: AwakenPracticeTemplate[] = [
  { id: 'awareness', title: 'Awareness', enabled: true },
  { id: 'words', title: 'Words', enabled: true },
  { id: 'anticipation', title: 'Anticipation', enabled: true },
  { id: 'kinetics', title: 'Kinetics', enabled: true },
  { id: 'education', title: 'Education', enabled: true },
  { id: 'notes', title: 'Notes', enabled: true },
]

export const AWAKEN_DURATION_PRESETS = [10, 15, 20, 30, 45, 60]
