import type { ThemePreference } from '../types'

const order: ThemePreference[] = ['system', 'light', 'dark']
const icons: Record<ThemePreference, string> = { system: '🌓', light: '☀️', dark: '🌙' }

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemePreference
  onChange: (t: ThemePreference) => void
}) {
  function cycle() {
    const next = order[(order.indexOf(theme) + 1) % order.length]
    onChange(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-base dark:bg-slate-800"
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
    >
      {icons[theme]}
    </button>
  )
}
