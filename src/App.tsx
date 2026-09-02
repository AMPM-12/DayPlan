import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider, useAppData } from './data/AppDataContext'
import { useThemeEffect } from './hooks/useThemeEffect'
import { TodayScreen } from './screens/TodayScreen'
import { EditPlanScreen } from './screens/EditPlanScreen'
import { ReportScreen } from './screens/ReportScreen'
import { BottomNav } from './components/BottomNav'

function Shell() {
  const { theme } = useAppData()
  useThemeEffect(theme)

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/plan" element={<EditPlanScreen />} />
        <Route path="/report" element={<ReportScreen />} />
      </Routes>
      <div className="no-print">
        <BottomNav />
      </div>
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
