import { useCallback, useEffect, useState } from 'react'
import type { CreateFamilyMemberInput, FamilyMember, UpdateFamilyMemberInput } from '@famhub/shared'
import { api } from '../lib/api'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export function useFamily() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiEnvelope<FamilyMember[]>>('/api/family')
      if (response.success && response.data) {
        setMembers(response.data)
      } else {
        setError(response.error || 'Failed to load family members')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  const createMember = useCallback(async (input: CreateFamilyMemberInput) => {
    const response = await api.post<ApiEnvelope<FamilyMember>>('/api/family', input)
    if (response.success && response.data) {
      setMembers((prev) => [...prev, response.data!].sort((a, b) => a.name.localeCompare(b.name)))
      return response.data
    }
    throw new Error(response.error || 'Failed to create family member')
  }, [])

  const updateMember = useCallback(async (id: string, input: UpdateFamilyMemberInput) => {
    const response = await api.put<ApiEnvelope<FamilyMember>>(`/api/family/${id}`, input)
    if (response.success && response.data) {
      setMembers((prev) => prev.map((m) => (m.id === id ? response.data! : m)))
      return response.data
    }
    throw new Error(response.error || 'Failed to update family member')
  }, [])

  const deleteMember = useCallback(async (id: string) => {
    const response = await api.delete<ApiEnvelope<null>>(`/api/family/${id}`)
    if (response.success) {
      setMembers((prev) => prev.filter((m) => m.id !== id))
      return
    }
    throw new Error(response.error || 'Failed to delete family member')
  }, [])

  return { members, loading, error, refetch: fetchMembers, createMember, updateMember, deleteMember }
}