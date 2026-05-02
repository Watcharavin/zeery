import { useState, useEffect } from 'react'
import { subscribeBudgets } from '../lib/firestore'
import { useAuth } from './useAuth'
import type { Budget } from '../types'

export function useBudget() {
  const { uid } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])

  useEffect(() => {
    if (!uid) return
    return subscribeBudgets(uid, setBudgets)
  }, [uid])

  return { budgets }
}
