import { useMemo, useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import type { ActivityLog } from '../types'
import { formatDuration, todayDateString } from '../utils/time'

type RangePreset = '7' | '30' | 'month' | 'custom'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayDateString(d)
}

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return todayDateString(d)
}

export function ReportScreen() {
  const { getAllDayStates } = useAppData()
  const [preset, setPreset] = useState<RangePreset>('7')
  const [customStart, setCustomStart] = useState(daysAgo(7))
  const [customEnd, setCustomEnd] = useState(todayDateString())

  const { start, end } = useMemo(() => {
    if (preset === '7') return { start: daysAgo(6), end: todayDateString() }
    if (preset === '30') return { start: daysAgo(29), end: todayDateString() }
    if (preset === 'month') return { start: startOfMonth(), end: todayDateString() }
    return { start: customStart, end: customEnd }
  }, [preset, customStart, customEnd])

  const logs: ActivityLog[] = useMemo(() => {
    const states = getAllDayStates().filter((s) => s.date >= start && s.date <= end)
    return states
      .flatMap((s) => s.logs)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [getAllDayStates, start, end])

  const summary = useMemo(() => {
    if (logs.length === 0) return null
    const onPlan = logs.filter((l) => l.completedAsPlanned).length
    const rated = logs.filter((l) => typeof l.rating === 'number')
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
        : undefined
    const intended = logs.reduce((sum, l) => sum + (l.intendedMinutesSpent ?? 0), 0)
    const actualDrift = logs.reduce(
      (sum, l) => sum + (l.completedAsPlanned ? 0 : l.actualMinutesSpent ?? 0),
      0,
    )
    return { total: logs.length, onPlan, avgRating, intended, actualDrift }
  }, [logs])

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Report</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">How you actually spent your time</p>
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base dark:bg-slate-800"
            aria-label="Print report"
            title="Print"
          >
            🖨️
          </button>
        )}
      </header>

      <div className="mb-5 flex flex-wrap gap-2 no-print">
        {(
          [
            ['7', 'Last 7 days'],
            ['30', 'Last 30 days'],
            ['month', 'This month'],
            ['custom', 'Custom'],
          ] as [RangePreset, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              preset === id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mb-5 flex gap-3 no-print">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-500">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>
      )}

      <p className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
        {start} – {end}
      </p>

      {!summary ? (
        <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No logged blocks in this range yet. Use “Log this block” on the Today screen.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Stat label="Blocks logged" value={String(summary.total)} />
            <Stat
              label="On plan"
              value={`${Math.round((summary.onPlan / summary.total) * 100)}%`}
            />
            <Stat
              label="Avg. rating"
              value={summary.avgRating !== undefined ? summary.avgRating.toFixed(1) : '—'}
            />
            <Stat label="Time drifted" value={formatDuration(summary.actualDrift)} />
          </div>

          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Entries
          </h3>
          <div className="space-y-2">
            {logs
              .slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {log.activityTitle}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{log.date}</p>
                    </div>
                    {typeof log.rating === 'number' && (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {log.rating}/10
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {log.completedAsPlanned ? '✓ As planned' : '↺ Different activity'}
                    </span>
                    {typeof log.intendedMinutesSpent === 'number' && (
                      <span>Intended: {formatDuration(log.intendedMinutesSpent)}</span>
                    )}
                    {!log.completedAsPlanned && log.actualActivityTitle && (
                      <span>
                        Actually: {log.actualActivityTitle}
                        {typeof log.actualMinutesSpent === 'number' &&
                          ` (${formatDuration(log.actualMinutesSpent)})`}
                      </span>
                    )}
                  </div>

                  {log.notes && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{log.notes}</p>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5">
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  )
}
