import type { Category, CategoryId } from '../types'

export const CATEGORIES: Category[] = [
  { id: 'spiritual', label: 'Spiritual', color: '#8b5cf6' },
  { id: 'work', label: 'Work', color: '#2563eb' },
  { id: 'health', label: 'Health', color: '#16a34a' },
  { id: 'family', label: 'Family', color: '#f59e0b' },
  { id: 'home', label: 'Home', color: '#78716c' },
  { id: 'personal', label: 'Personal', color: '#ec4899' },
  { id: 'free', label: 'Free time', color: '#06b6d4' },
]

export function getCategory(id?: CategoryId): Category | undefined {
  if (!id) return undefined
  return CATEGORIES.find((c) => c.id === id)
}
