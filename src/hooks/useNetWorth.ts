import { useState, useEffect } from 'react'
import { subscribeAssets, subscribeLiabilities } from '../lib/firestore'
import { useAuth } from './useAuth'
import type { Asset, Liability } from '../types'

export function useNetWorth() {
  const { uid } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let aLoaded = false
    let lLoaded = false

    const unsubA = subscribeAssets(uid, data => {
      setAssets(data)
      aLoaded = true
      if (lLoaded) setLoading(false)
    })

    const unsubL = subscribeLiabilities(uid, data => {
      setLiabilities(data)
      lLoaded = true
      if (aLoaded) setLoading(false)
    })

    return () => { unsubA(); unsubL() }
  }, [uid])

  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0)
  const netWorth = totalAssets - totalLiabilities

  return { assets, liabilities, totalAssets, totalLiabilities, netWorth, loading }
}
