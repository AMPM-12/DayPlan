import { NavLink, useLocation } from 'react-router-dom'
import { IconCircleCheck, IconClock, IconEllipsis, IconTarget } from './icons/NavIcons'

interface Tab {
  to: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  // Extra paths that should also light up this tab — used only by "More",
  // since /report and /plan are still their own real routes (deep links
  // and existing behavior untouched), just reached THROUGH More now rather
  // than being their own top-level tabs.
  alsoMatches?: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Today', icon: IconClock },
  { to: '/focus', label: 'Focus Sessions', icon: IconTarget },
  { to: '/tasks', label: 'Tasks', icon: IconCircleCheck },
  { to: '/more', label: 'More', icon: IconEllipsis, alsoMatches: ['/report', '/plan'] },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-[var(--bottom-nav-height)] border-t border-muted/20 bg-cream/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const isActive =
            tab.to === '/'
              ? location.pathname === '/'
              : location.pathname === tab.to || (tab.alsoMatches?.includes(location.pathname) ?? false)
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive ? 'text-sage' : 'text-muted'
              }`}
            >
              <Icon width={22} height={22} />
              {tab.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
