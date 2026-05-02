import { useState, useEffect } from 'react'
import { where } from 'firebase/firestore'
import { subscribeTransactions } from '../lib/firestore'
import { useAuth } from './useAuth'
import type { Transaction } from '../types'

export function useTransactions() {
  const { uid } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const since = new Date()
    since.setDate(since.getDate() - 60)
    const sinceStr = since.toISOString().split('T')[0]

    const unsub = subscribeTransactions(uid, txs => {
      setTransactions(txs)
      setLoading(false)
    }, [where('date', '>=', sinceStr)])

    return unsub
  }, [uid])

  return { transactions, loading }
}
