import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useShoppingList } from '../hooks/useShoppingList'
import { SHOPPING_CATEGORIES, type ShoppingItem } from '@famhub/shared'

const emptyForm = {
  name: '',
  quantity: '1',
  unit: '',
  price: '',
  category: SHOPPING_CATEGORIES[0] as string,
}

function describeItem(item: ShoppingItem) {
  const details: string[] = []
  if (item.quantity !== 1 || item.unit) {
    details.push(`${item.quantity}${item.unit ? ` ${item.unit}` : ''}`)
  }
  if (item.price !== null) {
    details.push(item.price.toFixed(2))
  }
  return details.join(' · ')
}

export function ShoppingListPage() {
  const { items, loading, addItem, toggleItem, removeItem, clearChecked } = useShoppingList()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return

    setSubmitting(true)
    setFormError(null)
    try {
      await addItem({
        name,
        quantity: Number(form.quantity),
        unit: form.unit.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        category: form.category,
      })
      setForm(emptyForm)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shopping list</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void clearChecked()}>
            Clear checked
          </Button>
          <Button onClick={() => setOpen(true)}>New item</Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Loading items…</p>}

      {!loading && items.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Your shopping list is empty — add your first item.</p>
        </Card>
      )}

      {SHOPPING_CATEGORIES.map((category) => {
        const group = items.filter((item) => item.category === category)
        if (!group.length) return null

        return (
          <section key={category} className="space-y-2">
            <h2 className="text-sm font-medium text-muted">{category}</h2>
            <ul className="space-y-2">
              {group.map((item) => (
                <li key={item.id}>
                  <Card className="flex items-center justify-between p-3">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => void toggleItem(item)}
                      />
                      <span className={item.checked ? 'text-muted line-through' : ''}>{item.name}</span>
                      {describeItem(item) && (
                        <span className="text-xs text-muted">{describeItem(item)}</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      className="text-sm text-muted hover:text-danger"
                    >
                      Delete
                    </button>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <Dialog open={open} onClose={() => setOpen(false)} title="New item">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Item"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>

          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            >
              {SHOPPING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              {submitting ? 'Adding…' : 'Add item'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}