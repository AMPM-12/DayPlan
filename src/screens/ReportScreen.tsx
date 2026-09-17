import { useMemo, useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import type { Activity, ActivityLog } from '../types'
import { formatDuration, todayDateString } from '../utils/time'
import { toCsv } from '../utils/csv'
import { Sheet } from '../components/Sheet'
import { LogForm } from '../components/LogForm'
import { IconDownload, IconPrinter } from '../components/icons/CategoryIcons'

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
  const { getAllDayStates, getDayState, profiles, updateLog } = useAppData()
  const [preset, setPreset] = useState<RangePreset>('7')
  const [customStart, setCustomStart] = useState(daysAgo(7))
  const [customEnd, setCustomEnd] = useState(todayDateString())
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null)
  // Editing a log writes straight to storage rather than through React
  // state (true for every date, since logs live inside per-date DayStates
  // that this screen reads directly), so bump this to force a re-read.
  const [refreshTick, setRefreshTick] = useState(0)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllDayStates, start, end, refreshTick])

  const editingActivity: Activity | null = useMemo(() => {
    if (!editingLog) return null
    const found = profiles.flatMap((p) => p.activities).find((a) => a.id === editingLog.activityId)
    if (found) return found
    // The activity was since deleted — reconstruct a minimal stand-in so the
    // form still has something to render against.
    return {
      id: editingLog.activityId,
      title: editingLog.activityTitle,
      startTime: '00:00',
      durationMin: editingLog.intendedMinutesSpent ?? 0,
      isFocusSession:
        editingLog.productivityScore !== undefined || editingLog.disciplineScore !== undefined,
    }
  }, [editingLog, profiles])

  const editingDocket = useMemo(
    () => (editingLog ? (getDayState(editingLog.date).dockets?.[editingLog.activityId] ?? []) : []),
    [editingLog, getDayState],
  )

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

  function handleExportCsv() {
    const header = [
      'Date',
      'Activity',
      'Intended Minutes',
      'Actual Minutes',
      'Rating',
      'Notes',
      'Completed As Planned',
    ]
    const rows = logs.map((l) => [
      l.date,
      l.activityTitle,
      l.intendedMinutesSpent,
      l.actualMinutesSpent,
      l.rating,
      l.notes,
      l.completedAsPlanned ? 'Yes' : 'No',
    ])
    const csv = toCsv([header, ...rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dayplan-report-${start}-to-${end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-[calc(var(--bottom-nav-height)+1rem)] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-bold text-charcoal">Report</h1>
          <p className="text-sm text-muted">How you actually spent your time</p>
        </div>
        {logs.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5 text-charcoal"
              aria-label="Export CSV"
              title="Export CSV"
            >
              <IconDownload width={18} height={18} />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5 text-charcoal"
              aria-label="Print report"
              title="Print"
            >
              <IconPrinter width={18} height={18} />
            </button>
          </div>
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
                ? 'bg-sage text-white'
                : 'bg-charcoal/5 text-charcoal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mb-5 flex gap-3 no-print">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full rounded-xl border border-muted/30 bg-cream px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full rounded-xl border border-muted/30 bg-cream px-3 py-2 text-sm text-charcoal"
            />
          </label>
        </div>
      )}

      <p className="mb-3 font-mono text-sm font-medium text-muted">
        {start} – {end}
      </p>

      {!summary ? (
        <div className="rounded-3xl bg-charcoal/5 p-6 text-center">
          <p className="text-sm font-medium text-muted">
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
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setEditingLog(log)}
                  className="w-full rounded-2xl bg-cream px-4 py-3.5 text-left shadow-sm ring-1 ring-charcoal/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-charcoal">
                        {log.activityTitle}
                      </p>
                      <p className="font-mono text-xs text-muted">{log.date}</p>
                    </div>
                    {typeof log.rating === 'number' && (
                      <span className="shrink-0 rounded-full bg-sage/10 px-2.5 py-1 text-xs font-semibold text-sage">
                        {log.rating}/10
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      {log.completedAsPlanned ? '✓ As planned' : '↺ Different activity'}
                    </span>
                    {typeof log.intendedMinutesSpent === 'number' && (
                      <span>Intended: <span className="font-mono">{formatDuration(log.intendedMinutesSpent)}</span></span>
                    )}
                    {!log.completedAsPlanned && log.actualActivityTitle && (
                      <span>
                        Actually: {log.actualActivityTitle}
                        {typeof log.actualMinutesSpent === 'number' && (
                          <span className="font-mono"> ({formatDuration(log.actualMinutesSpent)})</span>
                        )}
                      </span>
                    )}
                  </div>

                  {log.notes && (
                    <p className="mt-2 text-sm text-charcoal">{log.notes}</p>
                  )}
                </button>
              ))}
          </div>
        </>
      )}

      <Sheet open={!!editingLog} onClose={() => setEditingLog(null)} title="Edit log">
        {editingLog && editingActivity && (
          <LogForm
            activity={editingActivity}
            docket={editingDocket}
            initial={editingLog}
            onCancel={() => setEditingLog(null)}
            onSave={(payload, updatedDocket) => {
              const date = editingLog.date
              updateLog(
                date,
                { ...editingLog, ...payload },
                updatedDocket ? { activityId: editingLog.activityId, tasks: updatedDocket } : undefined,
              )
              setEditingLog(null)
              setRefreshTick((t) => t + 1)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream p-4 shadow-sm ring-1 ring-charcoal/5">
      <p className="text-2xl font-bold text-charcoal">{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  )
}
