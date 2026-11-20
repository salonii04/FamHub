import { useMemo } from 'react'
import { Link } from 'react-router'
import { addDays, format, isToday, isBefore, parseISO, startOfDay } from 'date-fns'
import { Card, CardTitle } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { useAppointments } from '../hooks/useAppointments'
import { useShoppingList } from '../hooks/useShoppingList'
import { useBudget } from '../hooks/useBudget'

function SectionLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="text-sm text-brand hover:underline">
      {children}
    </Link>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const today = useMemo(() => startOfDay(new Date()), [])
  const month = format(today, 'yyyy-MM')

  const { tasks, loading: tasksLoading } = useTasks()
  const { appointments, loading: apptLoading } = useAppointments({
    from: format(today, 'yyyy-MM-dd'),
    to: format(addDays(today, 7), 'yyyy-MM-dd'),
  })
  const { items, loading: shoppingLoading } = useShoppingList()
  const { summary } = useBudget(month)

  const currency = user?.currency ?? 'INR'
  const money = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency }),
    [currency]
  )

  const openTasks = tasks.filter((t) => !t.is_completed)
  const dueSoon = openTasks
    .filter((t) => t.due_date && (isToday(parseISO(t.due_date)) || isBefore(parseISO(t.due_date), today)))
    .slice(0, 5)
  const toBuy = items.filter((i) => !i.checked)
  const upcoming = [...appointments]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {user?.name ? `Hello, ${user.name}` : 'Welcome to FamHub'}
        </h1>
        <p className="text-sm text-muted">{format(today, 'EEEE, d MMMM yyyy')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Open tasks</p>
          <p className="text-2xl font-semibold">{tasksLoading ? '…' : openTasks.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Items to buy</p>
          <p className="text-2xl font-semibold">{shoppingLoading ? '…' : toBuy.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Balance this month</p>
          <p className="text-2xl font-semibold">{summary ? money.format(summary.balance) : '…'}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Due today or overdue</CardTitle>
            <SectionLink to="/tasks">All tasks</SectionLink>
          </div>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-muted">Nothing due. Nice work.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dueSoon.map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>{t.title}</span>
                  <span className="text-muted">{format(parseISO(t.due_date!), 'd MMM')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Next 7 days</CardTitle>
            <SectionLink to="/calendar">Calendar</SectionLink>
          </div>
          {apptLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted">No appointments this week.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>{a.title}</span>
                  <span className="text-muted">{format(parseISO(a.start_time), 'EEE d MMM, h:mm a')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
