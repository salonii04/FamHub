import { useMemo, useState, type FormEvent } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { REMINDER_OPTIONS } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useAppointments } from '../hooks/useAppointments'

const emptyForm = {
  title: '',
  location: '',
  description: '',
  start_time: '',
  end_time: '',
  color: '#3b82f6',
  reminder_minutes: '',
}

const WEEKDAY_NAMES = Array.from({ length: 7 }, (_, i) => i)
const REMINDER_CHOICES = REMINDER_OPTIONS.filter((minutes) => minutes > 0)

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month],
  )

  const { appointments, loading, error, createAppointment, deleteAppointment } = useAppointments({
    from: format(days[0], 'yyyy-MM-dd'),
    to: format(days[days.length - 1], 'yyyy-MM-dd'),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return

    setSubmitting(true)
    setFormError(null)
    try {
      await createAppointment({
        title,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        color: form.color,
        reminder_minutes: form.reminder_minutes === '' ? null : Number(form.reminder_minutes),
      })
      setForm(emptyForm)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create appointment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <Button onClick={() => setOpen(true)}>New appointment</Button>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setMonth(subMonths(month, 1))}>
          Previous
        </Button>
        <h2 className="font-medium">{format(month, 'MMMM yyyy')}</h2>
        <Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>
          Next
        </Button>
      </div>

      {loading && <p className="text-sm text-muted">Loading appointments…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line">
        {WEEKDAY_NAMES.map((i) => (
          <div key={i} className="bg-surface p-2 text-center text-xs font-medium text-muted">
            {format(days[i], 'EEE')}
          </div>
        ))}

        {days.map((day) => {
          const dayAppointments = appointments.filter((a) => isSameDay(parseISO(a.start_time), day))
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 bg-surface p-2 text-xs ${isSameMonth(day, month) ? '' : 'text-muted'}`}
            >
              <div className="mb-1 font-medium">{format(day, 'd')}</div>
              <ul className="space-y-1">
                {dayAppointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between gap-1 rounded px-1 py-0.5"
                    style={{ borderLeft: `3px solid ${appointment.color}` }}
                  >
                    <span className="truncate">
                      {format(parseISO(appointment.start_time), 'HH:mm')} {appointment.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteAppointment(appointment.id)}
                      className="text-muted hover:text-danger"
                      aria-label={`Delete ${appointment.title}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="New appointment">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />
            <Input
              label="End"
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              required
            />
          </div>

          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Reminder</span>
              <select
                value={form.reminder_minutes}
                onChange={(e) => setForm({ ...form, reminder_minutes: e.target.value })}
                className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
              >
                <option value="">None</option>
                {REMINDER_CHOICES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min before
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Color"
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add appointment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}