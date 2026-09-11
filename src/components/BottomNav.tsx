import { NavLink, useLocation } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  icon: string
  // Extra paths that should also light up this tab — used only by "More",
  // since /report and /plan are still their own real routes (deep links
  // and existing behavior untouched), just reached THROUGH More now rather
  // than being their own top-level tabs.
  alsoMatches?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Today', icon: '🕐' },
  { to: '/focus', label: 'Focus Sessions', icon: '🎯' },
  { to: '/tasks', label: 'Tasks', icon: '✅' },
  { to: '/more', label: 'More', icon: '⋯', alsoMatches: ['/report', '/plan'] },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const isActive =
            tab.to === '/'
              ? location.pathname === '/'
              : location.pathname === tab.to || (tab.alsoMatches?.includes(location.pathname) ?? false)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
