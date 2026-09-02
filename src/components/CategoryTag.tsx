import { getCategory } from '../data/categories'
import type { CategoryId } from '../types'

export function CategoryDot({ category }: { category?: CategoryId }) {
  const cat = getCategory(category)
  if (!cat) return null
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: cat.color }}
      aria-hidden
    />
  )
}

export function CategoryChip({ category }: { category?: CategoryId }) {
  const cat = getCategory(category)
  if (!cat) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
    >
      <CategoryDot category={category} />
      {cat.label}
    </span>
  )
}
