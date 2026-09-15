import type { AwakenPracticeTemplate } from '../types'

export const DEFAULT_AWAKEN_PRACTICES: AwakenPracticeTemplate[] = [
  { id: 'awareness', title: 'Awareness', enabled: true, prompt: 'Quiet time, stillness, prayer, meditation' },
  { id: 'words', title: 'Words', enabled: true, prompt: 'Affirmations, declarations, values, intentions' },
  { id: 'anticipation', title: 'Anticipation', enabled: true, prompt: 'Visualise, imagine, mentally rehearse the day' },
  { id: 'kinetics', title: 'Kinetics', enabled: true, prompt: 'Physical movement, exercise, stretching, walking' },
  { id: 'education', title: 'Education', enabled: true, prompt: 'Reading, studying, learning' },
  { id: 'notes', title: 'Notes', enabled: true, prompt: 'Journaling, gratitude, planning, reflection' },
]

export const AWAKEN_DURATION_PRESETS = [10, 15, 20, 30, 45, 60]
