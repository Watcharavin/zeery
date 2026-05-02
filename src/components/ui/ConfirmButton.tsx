import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  onConfirm: () => void
  disabled?: boolean
  size?: number
}

export default function ConfirmButton({ onConfirm, disabled, size = 13 }: Props) {
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const handleClick = () => {
    if (disabled) return
    if (!pending) {
      setPending(true)
      timer.current = setTimeout(() => setPending(false), 2500)
    } else {
      if (timer.current) clearTimeout(timer.current)
      setPending(false)
      onConfirm()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={pending ? 'กดอีกครั้งเพื่อยืนยันลบ' : 'ลบ'}
      style={{
        minWidth: pending ? 72 : 30,
        height: 30,
        borderRadius: '10px',
        border: `2px solid ${pending ? 'var(--red)' : 'rgba(224,90,90,0.35)'}`,
        background: pending ? 'var(--red-fill)' : 'rgba(224,90,90,0.06)',
        color: 'var(--red)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: pending ? '0 8px' : 0,
        fontSize: '0.72rem',
        fontFamily: "'Kalam', 'Itim', cursive",
        fontWeight: 700,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <Trash2 size={size} strokeWidth={2} />
      {pending && 'ยืนยัน?'}
    </button>
  )
}
