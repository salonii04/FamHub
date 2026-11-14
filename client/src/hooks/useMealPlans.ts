import { useCallback, useEffect, useState } from 'react'
import type { CreateMealPlanInput, MealPlan, UpdateMealPlanInput } from '@famhub/shared'
import { api } from '../lib/api'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export interface MealPlanRange {
  start_date: string
  end_date: string
}

export function useMealPlans({ start_date, end_date }: MealPlanRange) {
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiEnvelope<MealPlan[]>>(
        `/api/meal-plans?start_date=${start_date}&end_date=${end_date}`,
      )
      if (response.success && response.data) {
        setPlans(response.data)
      } else {
        setError(response.error || 'Failed to load meal plans')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plans')
    } finally {
      setLoading(false)
    }
  }, [start_date, end_date])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  // Fills or replaces whatever is in this date + meal_type slot.
  const saveMealPlan = useCallback(async (input: CreateMealPlanInput) => {
    const response = await api.post<ApiEnvelope<MealPlan>>('/api/meal-plans', input)
    if (response.success && response.data) {
      const saved = response.data
      setPlans((prev) => [...prev.filter((p) => !(p.date === saved.date && p.meal_type === saved.meal_type)), saved])
      return saved
    }
    throw new Error(response.error || 'Failed to save meal plan')
  }, [])

  const updateMealPlan = useCallback(async (id: string, input: UpdateMealPlanInput) => {
    const response = await api.put<ApiEnvelope<MealPlan>>(`/api/meal-plans/${id}`, input)
    if (response.success && response.data) {
      setPlans((prev) => prev.map((p) => (p.id === id ? response.data! : p)))
      return response.data
    }
    throw new Error(response.error || 'Failed to update meal plan')
  }, [])

  const deleteMealPlan = useCallback(async (id: string) => {
    const response = await api.delete<ApiEnvelope<null>>(`/api/meal-plans/${id}`)
    if (response.success) {
      setPlans((prev) => prev.filter((p) => p.id !== id))
      return
    }
    throw new Error(response.error || 'Failed to delete meal plan')
  }, [])

  return { plans, loading, error, refetch: fetchPlans, saveMealPlan, updateMealPlan, deleteMealPlan }
}