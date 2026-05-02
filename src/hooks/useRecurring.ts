import { useState, useEffect } from 'react'
import { subscribeRecurring } from '../lib/firestore'
import { useAuth } from './useAuth'
import type { Recurring } from '../types'

export function useRecurring() {
  const { uid } = useAuth()
  const [recurring, setRecurring] = useState<Recurring[]>([])

  useEffect(() => {
    if (!uid) return
    return subscribeRecurring(uid, setRecurring)
  }, [uid])

  return { recurring }
}
