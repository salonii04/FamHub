import { useMemo, useState, type FormEvent } from 'react'
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns'
import { MEAL_TYPES, type MealPlan } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useMealPlans } from '../hooks/useMealPlans'

export function MealPlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const { plans, loading, error, saveMealPlan, deleteMealPlan } = useMealPlans({
    start_date: format(days[0], 'yyyy-MM-dd'),
    end_date: format(days[6], 'yyyy-MM-dd'),
  })

  const [editing, setEditing] = useState<{ date: string; meal_type: string; plan?: MealPlan } | null>(null)
  const [customMeal, setCustomMeal] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function planFor(date: string, mealType: string) {
    return plans.find((p) => p.date === date && p.meal_type === mealType)
  }

  function openSlot(date: string, mealType: string) {
    const existing = planFor(date, mealType)
    setEditing({ date, meal_type: mealType, plan: existing })
    setCustomMeal(existing?.custom_meal ?? '')
    setNotes(existing?.notes ?? '')
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return

    setSubmitting(true)
    setFormError(null)
    try {
      await saveMealPlan({
        date: editing.date,
        meal_type: editing.meal_type as (typeof MEAL_TYPES)[number],
        custom_meal: customMeal.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save meal')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClear() {
    if (!editing?.plan) return
    setSubmitting(true)
    try {
      await deleteMealPlan(editing.plan.id)
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not clear meal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Meal planner</h1>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          Previous
        </Button>
        <h2 className="font-medium">
          {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
        </h2>
        <Button variant="secondary" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          Next
        </Button>
      </div>

      {loading && <p className="text-sm text-muted">Loading meal plan…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto">
        <div className="grid min-w-[800px] grid-cols-[100px_repeat(7,1fr)] gap-px overflow-hidden rounded-lg border border-line bg-line">
          <div className="bg-surface p-2" />
          {days.map((day) => (
            <div key={day.toISOString()} className="bg-surface p-2 text-center text-xs font-medium text-muted">
              {format(day, 'EEE d')}
            </div>
          ))}

          {MEAL_TYPES.flatMap((mealType) => [
            <div key={`${mealType}-label`} className="bg-surface p-2 text-xs font-medium text-muted">
              {mealType}
            </div>,
            ...days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const plan = planFor(dateStr, mealType)
              return (
                <button
                  key={`${mealType}-${dateStr}`}
                  type="button"
                  onClick={() => openSlot(dateStr, mealType)}
                  className="min-h-16 bg-surface p-2 text-left text-xs hover:bg-brand/5"
                >
                  {plan?.custom_meal ? <span>{plan.custom_meal}</span> : <span className="text-muted">+ Add</span>}
                </button>
              )
            }),
          ])}
        </div>
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.meal_type} · ${editing.date}` : ''}
      >
        {editing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input label="Meal" value={customMeal} onChange={(e) => setCustomMeal(e.target.value)} placeholder="Pasta night" />
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

            {formError && <p className="text-sm text-danger">{formError}</p>}

            <div className="flex justify-end gap-2">
              {editing.plan && (
                <Button type="button" variant="secondary" onClick={() => void handleClear()} disabled={submitting}>
                  Clear
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}