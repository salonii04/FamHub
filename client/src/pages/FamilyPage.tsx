import { useState, type FormEvent } from 'react'
import type { FamilyMember } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../hooks/useFamily'

const emptyForm = {
  name: '',
  role: '',
  color: '#3B82F6',
  birthdate: '',
  allergies: '',
  medications: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
}

function toList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function FamilyPage() {
  const { user } = useAuth()
  const { members, loading, error, createMember, updateMember, deleteMember } = useFamily()
  const canManage = user?.role !== 'child'

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(member: FamilyMember) {
    setEditingId(member.id)
    setForm({
      name: member.name,
      role: member.role,
      color: member.color,
      birthdate: member.birthdate ?? '',
      allergies: member.allergies.join(', '),
      medications: member.medications.join(', '),
      emergency_contact_name: member.emergency_contact_name ?? '',
      emergency_contact_phone: member.emergency_contact_phone ?? '',
      notes: member.notes ?? '',
    })
    setFormError(null)
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return

    setSubmitting(true)
    setFormError(null)
    try {
      const input = {
        name,
        role: form.role.trim() || undefined,
        color: form.color,
        birthdate: form.birthdate || undefined,
        allergies: toList(form.allergies),
        medications: toList(form.medications),
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }

      if (editingId) {
        await updateMember(editingId, input)
      } else {
        await createMember(input)
      }
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save family member')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Family</h1>
        {canManage && <Button onClick={openCreate}>New member</Button>}
      </div>

      {loading && <p className="text-sm text-muted">Loading family members…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && members.length === 0 && (
        <Card>
          <p className="text-sm text-muted">No family members yet — add your first one.</p>
        </Card>
      )}

      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted">
                      {member.role}
                      {member.birthdate ? ` · born ${member.birthdate}` : ''}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => openEdit(member)} className="text-muted hover:text-ink">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMember(member.id)}
                      className="text-muted hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {(member.allergies.length > 0 || member.medications.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {member.allergies.length > 0 && <span>Allergies: {member.allergies.join(', ')}</span>}
                  {member.medications.length > 0 && <span>Medications: {member.medications.join(', ')}</span>}
                </div>
              )}

              {(member.emergency_contact_name || member.emergency_contact_phone) && (
                <p className="mt-2 text-xs text-muted">
                  Emergency: {[member.emergency_contact_name, member.emergency_contact_phone].filter(Boolean).join(' · ')}
                </p>
              )}

              {member.notes && <p className="mt-2 text-sm">{member.notes}</p>}
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit family member' : 'New family member'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Parent, Child, Pet…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Birthdate"
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            />
            <Input label="Color" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>

          <Input
            label="Allergies"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            placeholder="Peanuts, pollen (comma separated)"
          />
          <Input
            label="Medications"
            value={form.medications}
            onChange={(e) => setForm({ ...form, medications: e.target.value })}
            placeholder="Comma separated"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Emergency contact name"
              value={form.emergency_contact_name}
              onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
            />
            <Input
              label="Emergency contact phone"
              value={form.emergency_contact_phone}
              onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
            />
          </div>

          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add member'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}