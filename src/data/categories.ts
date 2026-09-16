import type { Category, CategoryId } from '../types'
import {
  IconBriefcase,
  IconCoffee,
  IconHeartPulse,
  IconHouse,
  IconSparkles,
  IconUser,
  IconUsers,
} from '../components/icons/CategoryIcons'

export const CATEGORIES: Category[] = [
  { id: 'spiritual', label: 'Spiritual' },
  { id: 'work', label: 'Work' },
  { id: 'health', label: 'Health' },
  { id: 'family', label: 'Family' },
  { id: 'home', label: 'Home' },
  { id: 'personal', label: 'Personal' },
  { id: 'free', label: 'Free time' },
]

export const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  spiritual: IconSparkles,
  work: IconBriefcase,
  health: IconHeartPulse,
  family: IconUsers,
  home: IconHouse,
  personal: IconUser,
  free: IconCoffee,
}

export function getCategory(id?: CategoryId): Category | undefined {
  if (!id) return undefined
  return CATEGORIES.find((c) => c.id === id)
}
