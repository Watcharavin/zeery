import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter
    setItems(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id))
    }, 2800)
  }, [])

  const remove = (id: number) => setItems(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 12,
              background: item.type === 'success' ? 'var(--bg2)' : 'rgba(220,38,38,0.12)',
              border: `1px solid ${item.type === 'success' ? 'var(--border)' : 'rgba(220,38,38,0.3)'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              color: item.type === 'success' ? 'var(--text)' : 'var(--red)',
              fontSize: '0.85rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              pointerEvents: 'auto',
              animation: 'toast-in 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {item.type === 'success'
              ? <CheckCircle size={15} color="var(--green)" strokeWidth={2} />
              : <AlertCircle size={15} color="var(--red)" strokeWidth={2} />
            }
            {item.message}
            <button
              onClick={() => remove(item.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text2)', padding: 0, display: 'flex',
                alignItems: 'center', marginLeft: 4,
              }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
