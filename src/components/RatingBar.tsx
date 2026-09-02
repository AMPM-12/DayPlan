export function RatingBar({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (value: number) => void
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 11 }, (_, i) => i).map((n) => (
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
