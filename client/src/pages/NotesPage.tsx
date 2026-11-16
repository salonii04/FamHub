import { useState, type FormEvent } from 'react'
import type { Note } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useNotes } from '../hooks/useNotes'

export function NotesPage() {
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setTitle('')
    setContent('')
    setIsPrivate(false)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(note: Note) {
    setEditing(note)
    setTitle(note.title)
    setContent(note.content)
    setIsPrivate(note.is_private)
    setFormError(null)
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setFormError(null)
    try {
      const input = { title: title.trim(), content, is_private: isPrivate }
      if (editing) {
        await updateNote(editing.id, input)
      } else {
        await createNote(input)
      }
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save note')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Button onClick={openNew}>New note</Button>
      </div>

      {loading && <p className="text-sm text-muted">Loading notes...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && notes.length === 0 && (
        <Card>
          <p className="text-sm text-muted">No notes yet. Write one for yourself or the whole family.</p>
        </Card>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {notes.map((note) => (
          <li key={note.id}>
            <Card className="flex h-full flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{note.title}</h2>
                <span className="shrink-0 rounded-lg bg-brand/10 px-2 py-0.5 text-xs text-brand">
                  {note.is_private ? 'Private' : 'Shared'}
                </span>
              </div>
              {note.content && <p className="whitespace-pre-wrap text-sm text-muted">{note.content}</p>}
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
                <span>{note.is_mine ? 'You' : note.author_name || 'Family member'}</span>
                {note.is_mine && (
                  <span className="flex gap-3">
                    <button type="button" onClick={() => openEdit(note)} className="hover:text-ink">
                      Edit
                    </button>
                    <button type="button" onClick={() => void deleteNote(note.id)} className="hover:text-danger">
                      Delete
                    </button>
                  </span>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit note' : 'New note'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Note</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private (only I can see this)
          </label>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}