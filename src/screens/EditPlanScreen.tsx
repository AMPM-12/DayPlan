import { useRef, useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import type { Activity, AppDataExport, Weekday } from '../types'
import { parseTimeToMinutes, todayDateString } from '../utils/time'
import { restackContiguously } from '../utils/reorderActivities'
import { parseAppDataExport } from '../utils/backup'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../utils/notifications'
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
    exportData,
    importData,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAppData()

  const [activeProfileId, setActiveProfileId] = useState(defaultProfileId)
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  const [editing, setEditing] = useState<Activity | 'new' | null>(null)
  const [managingProfiles, setManagingProfiles] = useState(false)
  const [mappingOpen, setMappingOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newProfileName, setNewProfileName] = useState('')

  const [backupOpen, setBackupOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppDataExport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importDone, setImportDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifMessage, setNotifMessage] = useState<string | null>(null)

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

  function closeBackup() {
    setBackupOpen(false)
    setPendingImport(null)
    setImportError(null)
    setImportDone(false)
  }

  function handleExport() {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dayplan-backup-${todayDateString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePickFile() {
    setImportError(null)
    setImportDone(false)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      setPendingImport(parseAppDataExport(text))
      setImportError(null)
    } catch (err) {
      setPendingImport(null)
      setImportError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  function confirmImport() {
    if (!pendingImport) return
    importData(pendingImport)
    setActiveProfileId(pendingImport.defaultProfileId)
    setPendingImport(null)
    setImportDone(true)
  }

  function closeNotif() {
    setNotifOpen(false)
  }

  async function handleToggleNotifications() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      setNotifMessage(null)
      return
    }

    if (!isNotificationSupported()) {
      setNotifMessage("Notifications aren't supported on this browser or device.")
      return
    }

    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      setNotificationsEnabled(true)
      setNotifMessage(null)
    } else if (permission === 'denied') {
      setNotifMessage(
        'Notifications are blocked. Enable them for this app in your browser or device settings, then try again.',
      )
    }
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

      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => setMappingOpen(true)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          Which plan applies each day →
        </button>
        <button
          type="button"
          onClick={() => setBackupOpen(true)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          Backup & restore →
        </button>
        <button
          type="button"
          onClick={() => setNotifOpen(true)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
        >
          Notifications →
        </button>
      </div>

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

      <Sheet open={backupOpen} onClose={closeBackup} title="Backup & restore">
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileSelected}
            className="hidden"
          />

          {pendingImport ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This will replace all profiles, the weekly schedule, and every day's history
                (completions, overrides, and logs) with the contents of this file. This can't be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white"
                >
                  Overwrite everything
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Export
                </p>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  Download every profile, the weekly schedule, and all day history as one JSON
                  file.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white"
                >
                  Export data
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Import
                </p>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  Restore from a previously exported file. You'll be asked to confirm before
                  anything is overwritten.
                </p>
                <button
                  type="button"
                  onClick={handlePickFile}
                  className="w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Choose file…
                </button>
                {importError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
                )}
                {importDone && (
                  <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                    Import complete.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={notifOpen} onClose={closeNotif} title="Notifications">
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
              notificationsEnabled
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                notificationsEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              {notificationsEnabled ? '✓' : ''}
            </span>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Activity notifications
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Get notified when a block is ending soon, and when the next one starts.
              </p>
            </div>
          </button>

          {notifMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">{notifMessage}</p>
          )}

          {notificationsEnabled && getNotificationPermission() === 'denied' && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Permission was revoked outside the app, so notifications won't be delivered until
              it's re-enabled in your browser or device settings.
            </p>
          )}
        </div>
      </Sheet>
    </div>
  )
}
