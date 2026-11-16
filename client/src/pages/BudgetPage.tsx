import { useMemo, useState, type FormEvent } from 'react'
import type { BudgetEntryType } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useBudget } from '../hooks/useBudget'
import { BUDGET_CATEGORIES } from '../lib/budgetCategories'

const SELECT_CLASS =
  'h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BudgetPage() {
  const { user } = useAuth()
  const canEdit = Boolean(user?.is_owner) || user?.role !== 'child'
  const currency = user?.currency ?? 'INR'
  const money = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])

  const [month, setMonth] = useState(today().slice(0, 7))
  const { transactions, summary, loading, error, addTransaction, deleteTransaction, saveLimit, removeLimit } =
    useBudget(month)

  const [txOpen, setTxOpen] = useState(false)
  const [type, setType] = useState<BudgetEntryType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today())

  const [limitOpen, setLimitOpen] = useState(false)
  const [limitCategory, setLimitCategory] = useState(BUDGET_CATEGORIES[0])
  const [limitAmount, setLimitAmount] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleTxSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await addTransaction({
        type,
        amount: Number(amount),
        category,
        description: description.trim() || undefined,
        date,
      })
      setAmount('')
      setDescription('')
      setTxOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add transaction')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLimitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await saveLimit(limitCategory, Number(limitAmount))
      setLimitAmount('')
      setLimitOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save limit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Budget</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className={SELECT_CLASS}
            aria-label="Month"
          />
          {canEdit && (
            <>
              <Button variant="secondary" onClick={() => { setFormError(null); setLimitOpen(true) }}>
                Set limit
              </Button>
              <Button onClick={() => { setFormError(null); setTxOpen(true) }}>Add transaction</Button>
            </>
          )}
        </div>
      </div>

      {!canEdit && <p className="text-sm text-muted">You have read-only access to the budget.</p>}
      {loading && <p className="text-sm text-muted">Loading budget...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Income</p>
            <p className="text-xl font-semibold">{money.format(summary.income)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Expenses</p>
            <p className="text-xl font-semibold">{money.format(summary.expenses)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Balance</p>
            <p className={`text-xl font-semibold ${summary.balance < 0 ? 'text-danger' : ''}`}>
              {money.format(summary.balance)}
            </p>
          </Card>
        </div>
      )}

      {summary && summary.byCategory.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">By category</h2>
          {summary.byCategory.map((item) => {
            const over = item.limit !== null && item.spent > item.limit
            const pct = item.limit ? Math.min(100, (item.spent / item.limit) * 100) : 0
            return (
              <Card key={item.category} className="space-y-2 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span className={over ? 'text-danger' : 'text-muted'}>
                    {money.format(item.spent)}
                    {item.limit !== null && ` / ${money.format(item.limit)}`}
                    {over && ' - over limit'}
                  </span>
                </div>
                {item.limit !== null && (
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-brand'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {canEdit && item.limit !== null && (
                  <button
                    type="button"
                    onClick={() => void removeLimit(item.category)}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove limit
                  </button>
                )}
              </Card>
            )
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Transactions</h2>
        {!loading && transactions.length === 0 && (
          <Card>
            <p className="text-sm text-muted">No transactions this month.</p>
          </Card>
        )}
        <ul className="space-y-2">
          {transactions.map((t) => (
            <li key={t.id}>
              <Card className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{t.description || t.category}</p>
                  <p className="text-xs text-muted">
                    {t.category} - {t.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.type === 'income' ? 'text-brand' : ''}>
                    {t.type === 'income' ? '+' : '-'}
                    {money.format(t.amount)}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void deleteTransaction(t.id)}
                      className="text-sm text-muted hover:text-danger"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={txOpen} onClose={() => setTxOpen(false)} title="Add transaction">
        <form onSubmit={handleTxSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as BudgetEntryType)} className={SELECT_CLASS}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASS}>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTxOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={limitOpen} onClose={() => setLimitOpen(false)} title="Set monthly limit">
        <form onSubmit={handleLimitSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Category</span>
            <select value={limitCategory} onChange={(e) => setLimitCategory(e.target.value)} className={SELECT_CLASS}>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Monthly limit"
            type="number"
            min="0.01"
            step="0.01"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            required
          />
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLimitOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save limit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}