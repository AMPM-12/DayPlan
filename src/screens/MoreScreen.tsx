import { Link } from 'react-router-dom'
import { IconChartBar, IconClipboardList } from '../components/icons/CategoryIcons'

// Landing page for the bottom nav's consolidated "More" tab — just an
// entry point in front of the existing Report and Plan (EditPlanScreen)
// screens, which keep their own routes/content untouched.
const entries = [
  { to: '/report', label: 'Report', description: 'How you actually spent your time', icon: IconChartBar },
  { to: '/plan', label: 'Plan & Backup', description: 'Edit your schedule, profiles, and backups', icon: IconClipboardList },
]

export function MoreScreen() {
  return (
    <div className="mx-auto max-w-md px-4 pb-[calc(var(--bottom-nav-height)+1rem)] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-charcoal">More</h1>
      </header>

      <div className="space-y-2">
        {entries.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-3.5 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/5"
          >
            <entry.icon width={20} height={20} className="shrink-0 text-charcoal" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-charcoal">{entry.label}</p>
              <p className="text-xs text-muted">{entry.description}</p>
            </div>
            <span className="shrink-0 text-muted">→</span>
          </Link>
        ))}
      </div>

      {/* Permanent, deliberately unobtrusive — lets you positively confirm
          which build is actually running (PWA/service-worker caching means
          "I reopened the app" never guarantees a fresh bundle loaded). */}
      <p className="mt-8 text-center text-[10px] text-muted">
        Build {__BUILD_COMMIT__} · {new Date(__BUILD_TIME__).toLocaleString()}
      </p>
    </div>
  )
}
