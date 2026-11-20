import { useCallback, useEffect, useState } from 'react'
import type { RewardTransaction, RewardsSummary } from '@famhub/shared'
import { api } from '../lib/api'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export function useRewards() {
  const [summary, setSummary] = useState<RewardsSummary | null>(null)
  const [transactions, setTransactions] = useState<RewardTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const [sum, tx] = await Promise.all([
        api.get<ApiEnvelope<RewardsSummary>>('/api/rewards/summary'),
        api.get<ApiEnvelope<RewardTransaction[]>>('/api/rewards/transactions'),
      ])
      if (sum.success && sum.data && tx.success && tx.data) {
        setSummary(sum.data)
        setTransactions(tx.data)
        setError(null)
      } else {
        setError(sum.error || tx.error || 'Failed to load rewards')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const send = useCallback(
    async (path: string, body: Record<string, unknown> = {}) => {
      const response = await api.post<ApiEnvelope<unknown>>(path, body)
      if (!response.success) throw new Error(response.error || 'Something went wrong')
      await refetch()
    },
    [refetch]
  )

  const approve = useCallback((taskId: string) => send(`/api/rewards/approve/${taskId}`), [send])
  const reject = useCallback((taskId: string) => send(`/api/rewards/reject/${taskId}`), [send])
  const redeem = useCallback(
    (memberId: string, points: number, note: string) =>
      send('/api/rewards/redeem', { member_id: memberId, points, note }),
    [send]
  )
  const adjust = useCallback(
    (memberId: string, points: number, note: string) =>
      send('/api/rewards/adjust', { member_id: memberId, points, note }),
    [send]
  )

  return { summary, transactions, loading, error, refetch, approve, reject, redeem, adjust }
}
