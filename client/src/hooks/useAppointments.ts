import { useCallback, useEffect, useState } from 'react'
import type { Appointment } from '@famhub/shared'
import { api } from '../lib/api'

export interface AppointmentRange {
  from: string
  to: string
}

export function useAppointments({ from, to }: AppointmentRange) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAppointments(await api.get<Appointment[]>(`/appointments?from=${from}&to=${to}`))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load appointments')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  const createAppointment = async (body: Record<string, unknown>) => {
    await api.post('/appointments', body)
    await load()
  }

  const deleteAppointment = async (id: string) => {
    await api.delete(`/appointments/${id}`)
    await load()
  }

  return { appointments, loading, error, createAppointment, deleteAppointment }
}