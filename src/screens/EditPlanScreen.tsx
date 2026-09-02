import { useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import type { Activity } from '../types'
import { parseTimeToMinutes } from '../utils/time'
import { formatClock, formatDuration } from '../utils/time'
import { CategoryDot } from '../components/CategoryTag'
import { Sheet } from '../components/Sheet'
import { ActivityForm } from '../components/ActivityForm'

export function EditPlanScreen() {
  const { plan, addActivity, updateActivity, deleteActivity } = useAppData()
  const [editing, setEditing] = useState<Activity | 'new' | null>(null)

  const sorted = [...plan].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
  )

  function close() {
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Your Plan</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Repeats every day</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-xl font-semibold text-white"
          aria-label="Add activity"
        >
          +
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No activities yet. Tap + to add your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setEditing(activity)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5"
            >
              <div className="w-14 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatClock(parseTimeToMinutes(activity.startTime))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CategoryDot category={activity.category} />
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {activity.title}
                  </p>
                  {activity.isFlexible && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                      Flexible
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDuration(activity.durationMin)}
                </p>
              </div>
              <span className="text-slate-300 dark:text-slate-600">›</span>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={!!editing}
        onClose={close}
        title={editing === 'new' ? 'Add activity' : 'Edit activity'}
      >
        <ActivityForm
          initial={editing !== 'new' && editing ? editing : undefined}
          onCancel={close}
          onSave={(activity) => {
            if (editing === 'new') addActivity(activity)
            else updateActivity(activity)
            close()
          }}
          onDelete={
            editing !== 'new' && editing
              ? () => {
                  deleteActivity(editing.id)
                  close()
                }
              : undefined
          }
        />
      </Sheet>
    </div>
  )
}
