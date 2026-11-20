import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { format, parseISO } from 'date-fns'
import type { RewardMemberSummary } from '@famhub/shared'
import { Button } from '../components/ui/Button'
import { Card, CardTitle } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useRewards } from '../hooks/useRewards'

type DialogState = { mode: 'redeem' | 'adjust'; member: RewardMemberSummary } | null

export function RewardsPage() {
  const { user } = useAuth()
  const isParent = Boolean(user?.is_owner) || user?.role !== 'child'
  const { summary, transactions, loading, error, approve, reject, redeem, adjust } = useRewards()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  function openDialog(mode: 'redeem' | 'adjust', member: RewardMemberSummary) {
    setDialog({ mode, member })
    setPoints('')
    setNote('')
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog) return
    const amount = Number(points)
    if (!Number.isInteger(amount) || amount === 0 || (dialog.mode === 'redeem' && amount < 0)) {
      setFormError(
        dialog.mode === 'redeem' ? 'Enter a whole number above 0' : 'Enter a whole number, not 0'
      )
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      if (dialog.mode === 'redeem') await redeem(dialog.member.id, amount, note)
      else await adjust(dialog.member.id, amount, note)
      setDialog(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecision(action: () => Promise<void>) {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading rewards…</p>

  const members = summary?.members ?? []
  const pending = summary?.pending ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-muted">
          Give a task points on the Tasks page. When it is done and approved, the points are added here.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {members.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No family members yet. <Link to="/family" className="text-brand hover:underline">Add someone</Link> to
            start giving rewards.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} aria-hidden />
                <CardTitle>{m.name}</CardTitle>
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {m.balance} <span className="text-base font-normal text-muted">points</span>
              </p>
              <p className="text-xs text-muted">
                {m.earned} added · {m.redeemed} spent
              </p>
              {isParent && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => openDialog('redeem', m)} disabled={m.balance <= 0}>
                    Redeem
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openDialog('adjust', m)}>
                    Adjust
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Waiting for approval</CardTitle>
          <ul className="space-y-3">
            {pending.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{task.title}</span>
                  <span className="text-muted">
                    {' '}
                    · {task.member_name ?? 'Someone'} · {task.points} points
                  </span>
                </span>
                {isParent ? (
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => void handleDecision(() => approve(task.id))}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleDecision(() => reject(task.id))}>
                      Send back
                    </Button>
                  </span>
                ) : (
                  <span className="text-muted">A parent will check it</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Recent activity</CardTitle>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Points show up here once tasks are approved.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{t.member_name}</span>
                  <span className="text-muted"> · {t.note ?? t.type}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted">{format(parseISO(t.created_at), 'd MMM')}</span>
                  <span className={t.points > 0 ? 'font-medium text-brand' : 'font-medium text-danger'}>
                    {t.points > 0 ? `+${t.points}` : t.points}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'redeem' ? `Redeem points for ${dialog.member.name}` : `Adjust points for ${dialog?.member.name ?? ''}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {dialog?.mode === 'redeem' && (
            <p className="text-sm text-muted">{dialog.member.name} has {dialog.member.balance} points to spend.</p>
          )}
          <Input
            label={dialog?.mode === 'redeem' ? 'Points to spend' : 'Points to add (use a minus to remove)'}
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
          />
          <Input
            label={dialog?.mode === 'redeem' ? 'What for? (optional)' : 'Reason (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
