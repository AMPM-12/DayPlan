import { CATEGORY_ICONS, getCategory } from '../data/categories'
import type { CategoryId } from '../types'

export function CategoryDot({ category }: { category?: CategoryId }) {
  const cat = getCategory(category)
  if (!cat) return null
  const Icon = CATEGORY_ICONS[cat.id]
  return <Icon width={14} height={14} className="shrink-0 text-charcoal" aria-hidden />
}
