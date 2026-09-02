export function RatingBar({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number | undefined
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-11 flex-1 rounded-lg text-xs font-medium transition-colors ${
            value === n
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
