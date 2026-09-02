import { useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import type { Activity, Weekday } from '../types'
import { parseTimeToMinutes } from '../utils/time'
import { restackContiguously } from '../utils/reorderActivities'
import { Sheet } from '../components/Sheet'
import { ActivityForm } from '../components/ActivityForm'
import { ActivityList } from '../components/ActivityList'

const WEEKDAYS: [Weekday, string][] = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
]

export function EditPlanScreen() {
  const {
    profiles,
    defaultProfileId,
    addProfile,
    renameProfile,
    duplicateProfile,
    deleteProfile,
    addActivity,
    updateActivity,
    deleteActivity,
    reorderActivities,
    dayMapping,
    setDayMapping,
  } = useAppData()

  const [activeProfileId, setActiveProfileId] = useState(defaultProfileId)
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const [editing, setEditing] = useState<Activity | 'new' | null>(null)
  const [managingProfiles, setManagingProfiles] = useState(false)
  const [mappingOpen, setMappingOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newProfileName, setNewProfileName] = useState('')

  const sorted = activeProfile
    ? [...activeProfile.activities].sort(
        (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
      )
    : []

  function close() {
    setEditing(null)
  }

  function handleAddProfile() {
    const name = newProfileName.trim()
    if (!name) return
    const created = addProfile(name)
    setNewProfileName('')
    setActiveProfileId(created.id)
  }

  function handleDeleteProfile(id: string) {
    if (activeProfileId === id) setActiveProfileId(defaultProfileId)
    deleteProfile(id)
  }

  function handleReorder(ordered: Activity[]) {
    reorderActivities(activeProfileId, restackContiguously(ordered))
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

      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveProfileId(p.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              p.id === activeProfileId
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setManagingProfiles(true)}
          className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        >
          Manage
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMappingOpen(true)}
        className="mb-5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
      >
        Which plan applies each day →
      </button>

      {sorted.length === 0 ? (
        <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No activities yet. Tap + to add your first one.
          </p>
        </div>
      ) : (
        <ActivityList activities={sorted} onEdit={setEditing} onReorder={handleReorder} />
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
            if (editing === 'new') addActivity(activeProfileId, activity)
            else updateActivity(activeProfileId, activity)
            close()
          }}
          onDelete={
            editing !== 'new' && editing
              ? () => {
                  deleteActivity(activeProfileId, editing.id)
                  close()
                }
              : undefined
          }
        />
      </Sheet>

      <Sheet open={managingProfiles} onClose={() => setManagingProfiles(false)} title="Profiles">
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              {renamingId === p.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      renameProfile(p.id, renameValue.trim() || p.name)
                      setRenamingId(null)
                    }}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {p.name}
                    {p.id === defaultProfileId && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">default</span>
                    )}
                  </span>
                  <div className="flex shrink-0 gap-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id)
                        setRenameValue(p.name)
                      }}
                    >
                      Rename
                    </button>
                    <button type="button" onClick={() => duplicateProfile(p.id)}>
                      Duplicate
                    </button>
                    {p.id !== defaultProfileId && profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id)}
                        className="text-red-500 dark:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddProfile()
                }
              }}
              placeholder="New profile name"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddProfile}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Add
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet open={mappingOpen} onClose={() => setMappingOpen(false)} title="Weekly schedule">
        <div className="space-y-2">
          {WEEKDAYS.map(([day, label]) => (
            <div
              key={day}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
              <select
                value={dayMapping[day] ?? defaultProfileId}
                onChange={(e) => setDayMapping(day, e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
