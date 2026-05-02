import { useState, useEffect } from 'react'
import { subscribeGoals } from '../lib/firestore'
import { useAuth } from './useAuth'
import type { SavingsGoal } from '../types'

export function useGoals() {
  const { uid } = useAuth()
  const [goals, setGoals] = useState<SavingsGoal[]>([])

  useEffect(() => {
    if (!uid) return
    return subscribeGoals(uid, setGoals)
  }, [uid])

  return { goals }
}
