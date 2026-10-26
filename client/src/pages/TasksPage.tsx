import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useTasks } from '../hooks/useTasks'

const PRIORITIES = ['High', 'Medium', 'Low']

export function TasksPage() {
  const { tasks, loading, error, createTask, toggleComplete, deleteTask } = useTasks()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanedTitle = title.trim()
    if (!cleanedTitle) return

    setSubmitting(true)
    setFormError(null)
    try {
      await createTask({ title: cleanedTitle, priority: priority || undefined })
      setTitle('')
      setPriority('')
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Button onClick={() => setOpen(true)}>New task</Button>
      </div>

      {loading && <p className="text-sm text-muted">Loading tasks…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && tasks.length === 0 && (
        <Card>
          <p className="text-sm text-muted">No tasks yet — add your first one.</p>
        </Card>
      )}

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <Card className="flex items-center justify-between p-3">
              <label className="flex flex-1 items-center gap-3">
                <input type="checkbox" checked={task.is_completed} onChange={() => void toggleComplete(task)} />
                <span className={task.is_completed ? 'text-muted line-through' : ''}>{task.title}</span>
                {task.priority && (
                  <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs text-brand">{task.priority}</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => void deleteTask(task.id)}
                className="text-sm text-muted hover:text-danger"
              >
                Delete
              </button>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={open} onClose={() => setOpen(false)} title="New task">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="">None</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}