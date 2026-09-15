import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppDataProvider, useAppData } from './data/AppDataContext'
import { useThemeEffect } from './hooks/useThemeEffect'
import { TodayScreen } from './screens/TodayScreen'
import { TaskListScreen } from './screens/TaskListScreen'
import { EditPlanScreen } from './screens/EditPlanScreen'
import { FocusSessionsScreen } from './screens/FocusSessionsScreen'
import { AwakenScreen } from './screens/AwakenScreen'
import { ReportScreen } from './screens/ReportScreen'
import { MoreScreen } from './screens/MoreScreen'
import { BottomNav } from './components/BottomNav'

function Shell() {
  const { theme } = useAppData()
  useThemeEffect(theme)
  const location = useLocation()
  // AWAKEN is a focused, single-flow run screen — keep the tab bar out of
  // the way while it's on screen, same idea as a full-screen takeover.
  const hideNav = location.pathname === '/awaken'

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/tasks" element={<TaskListScreen />} />
        <Route path="/plan" element={<EditPlanScreen />} />
        <Route path="/focus" element={<FocusSessionsScreen />} />
        <Route path="/awaken" element={<AwakenScreen />} />
        <Route path="/report" element={<ReportScreen />} />
        <Route path="/more" element={<MoreScreen />} />
      </Routes>
      {!hideNav && (
        <div className="no-print">
          <BottomNav />
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppDataProvider>
  )
}
