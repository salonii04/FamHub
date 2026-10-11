import { Card, CardTitle } from '../components/ui/Card'

export function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to FamHub</h1>
      <Card>
        <CardTitle>Coming soon</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Chores, groceries, the calendar, and the money will live here.
        </p>
      </Card>
    </div>
  )
}