import { useMemo } from 'react'
import { useAppData } from '../data/AppDataContext'
import { TaskList } from '../components/TaskList'

export function TaskListScreen() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    clearCompletedTasks,
    toggleTaskComplete,
    reorderTasks,
  } = useAppData()

  const sorted = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks])
  const completedCount = tasks.filter((t) => t.completed).length
  const remaining = tasks.length - completedCount

  function handleClearCompleted() {
    // No existing in-app confirmation pattern fits an action this small
    // (the closest, the Backup & Restore import overwrite, is a whole-app
    // "replace everything" flow with its own Sheet-based warning step) —
    // native confirm() for this one, scoped, irreversible action instead.
    const noun = completedCount === 1 ? 'task' : 'tasks'
    if (!window.confirm(`Delete ${completedCount} completed ${noun}? This can't be undone.`)) return
    clearCompletedTasks()
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-[calc(var(--bottom-nav-height)+1rem)] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-charcoal">Tasks</h1>
          <p className="text-sm text-muted">
            {tasks.length === 0
              ? 'Nothing on your list yet'
              : `${remaining} of ${tasks.length} remaining`}
          </p>
        </div>
        {completedCount > 0 && (
          <button
            type="button"
            onClick={handleClearCompleted}
            className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400"
          >
            Clear completed
          </button>
        )}
      </header>

      <TaskList
        tasks={sorted}
        onAdd={addTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onToggleComplete={toggleTaskComplete}
        onReorder={reorderTasks}
      />
    </div>
  )
}
