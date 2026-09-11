import { useMemo } from 'react'
import { useAppData } from '../data/AppDataContext'
import { TaskList } from '../components/TaskList'

export function TaskListScreen() {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete, reorderTasks } = useAppData()

  const sorted = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks])
  const remaining = tasks.filter((t) => !t.completed).length

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 no-print">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Tasks</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {tasks.length === 0
            ? 'Nothing on your list yet'
            : `${remaining} of ${tasks.length} remaining`}
        </p>
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
