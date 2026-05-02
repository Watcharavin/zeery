import { createContext, useEffect, useState, type ReactNode } from 'react'
import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
  uid: string | null
  isAnonymous: boolean
  loading: boolean
}

export const AuthContext = createContext<AuthState>({
  uid: null,
  isAnonymous: true,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    uid: null,
    isAnonymous: true,
    loading: true,
  })

  useEffect(() => {
    // Firebase จะ persist session ใน IndexedDB อัตโนมัติ
    // onAuthStateChanged จะคืน user เดิมถ้ายังมี session อยู่
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setState({ uid: user.uid, isAnonymous: user.isAnonymous, loading: false })
      } else {
        // ไม่มี session → sign in ใหม่แบบ anonymous
        try {
          await signInAnonymously(auth)
          // onAuthStateChanged จะ fire อีกครั้งพร้อม user ใหม่
        } catch (err) {
          console.error('Anonymous sign-in failed:', err)
          setState(s => ({ ...s, loading: false }))
        }
      }
    })

    return unsub
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
