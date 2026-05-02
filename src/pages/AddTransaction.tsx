import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTransactions } from '../hooks/useTransactions'
import { addTransaction } from '../lib/firestore'
import { useCategories } from '../contexts/CategoriesContext'
import { Camera, Tag } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'
import { useToast } from '../components/ui/Toast'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function fmt(n: number) {
  if (n === 0) return '0'
  return n.toLocaleString('th-TH', { minimumFractionDigits: n % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })
}

type TxType = 'expense' | 'income' | 'savings'

const TYPE_LABELS: Record<TxType, string> = {
  expense: 'รายจ่าย',
  income: 'รายรับ',
  savings: 'โอนออม',
}

const DEFAULT_CAT: Record<TxType, string> = {
  expense: 'food',
  income: 'income',
  savings: 'savings',
}

const NUM_KEYS = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

const DEFAULT_CHIPS = [50, 100, 200, 500, 1000, 2000]

// ── component ─────────────────────────────────────────────────────────────────

export default function AddTransaction() {
  const navigate = useNavigate()
  const { uid } = useAuth()
  const { transactions } = useTransactions()
  const { toast } = useToast()
  const { categories, getCat } = useCategories()

  const [type, setType] = useState<TxType>('expense')
  const [amountStr, setAmountStr] = useState('0')
  const [catId, setCatId] = useState('food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = parseFloat(amountStr) || 0

  // quick chips: top 6 amounts from history
  const quickChips = useMemo(() => {
    const freq: Record<number, number> = {}
    for (const tx of transactions) {
      const abs = Math.round(Math.abs(tx.amount))
      if (abs > 0) freq[abs] = (freq[abs] || 0) + 1
    }
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([v]) => Number(v))
    return sorted.length >= 3 ? sorted : DEFAULT_CHIPS
  }, [transactions])

  const handleTypeChange = (t: TxType) => {
    setType(t)
    setCatId(DEFAULT_CAT[t])
  }

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmountStr(s => (s.length <= 1 ? '0' : s.slice(0, -1)))
      return
    }
    if (key === '.') {
      if (!amountStr.includes('.')) setAmountStr(s => s + '.')
      return
    }
    setAmountStr(s => {
      if (s.includes('.') && s.split('.')[1].length >= 2) return s
      if (s === '0') return key
      return s + key
    })
  }

  const handleChip = (v: number) => {
    setAmountStr(String(v))
  }

  const handleSave = async () => {
    setError(null)
    if (!uid) { setError('ยังไม่ได้ login — รีเฟรชหน้าแล้วลองใหม่'); return }
    if (amount <= 0) { setError('กรอกจำนวนเงินก่อน'); return }
    if (saving) return
    setSaving(true)
    try {
      const sign = type === 'income' ? 1 : -1
      const cat = getCat(catId)
      const trimmedNote = note.trim()
      await addTransaction(uid, {
        name: trimmedNote || cat.label,
        catId,
        amount: amount * sign,
        date,
        source: 'manual',
        ...(trimmedNote ? { note: trimmedNote } : {}),
      })
      toast('บันทึกรายการแล้ว')
      navigate('/')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`บันทึกไม่ได้: ${msg}`)
      setSaving(false)
    }
  }

  const accentColor = type === 'income' ? 'var(--green)' : type === 'savings' ? 'var(--purple)' : 'var(--accent)'

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', fontSize: '1.2rem', padding: '4px',
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: "'Caveat', cursive",
          fontSize: '1.8rem',
          fontWeight: 700,
          color: 'var(--text)',
          flex: 1,
          marginBottom: 0,
        }}>
          เพิ่มรายการ ✏️
        </h1>
        <button
          onClick={() => navigate('/slip')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer',
            fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.82rem', fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Camera size={14} strokeWidth={2} /> สแกน Slip
        </button>
      </div>

      {/* Type selector */}
      <div style={{
        display: 'flex',
        background: 'var(--bg3)',
        borderRadius: '14px',
        padding: '4px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {(Object.keys(TYPE_LABELS) as TxType[]).map(t => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: type === t ? '10px' : '8px',
              border: type === t ? `1px solid ${accentColor}` : '1px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Kalam', 'Itim', cursive",
              fontSize: '0.88rem',
              fontWeight: 700,
              background: type === t ? 'var(--bg2)' : 'transparent',
              color: type === t ? accentColor : 'var(--text2)',
              boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0 8px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text2)', marginRight: '4px', fontFamily: "'Kalam', 'Itim', cursive" }}>฿</span>
        <span style={{
          fontFamily: "'Caveat', cursive",
          fontSize: amount.toString().length > 7 ? '2.4rem' : '3.4rem',
          fontWeight: 700,
          color: amount === 0 ? 'var(--text2)' : accentColor,
          transition: 'color 0.15s',
        }}>
          {fmt(amount)}
        </span>
        {amountStr.endsWith('.') && (
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: '3.4rem', color: accentColor }}>.</span>
        )}
      </div>

      {/* Quick chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0 12px', scrollbarWidth: 'none' }}>
        {quickChips.map(v => (
          <button
            key={v}
            onClick={() => handleChip(v)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: '10px',
              border: amount === v ? `2px solid ${accentColor}` : '1px solid var(--border)',
              background: amount === v ? accentColor : 'var(--bg3)',
              color: amount === v ? '#fff' : 'var(--text)',
              fontFamily: "'Caveat', cursive",
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {v.toLocaleString('th-TH')}
          </button>
        ))}
      </div>

      {/* NumPad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {NUM_KEYS.map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            style={{
              padding: '18px 0',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: k === '⌫' ? 'var(--red-fill)' : 'var(--bg3)',
              color: k === '⌫' ? 'var(--red)' : 'var(--text)',
              fontSize: k === '⌫' ? '1.2rem' : '1.5rem',
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={e => (e.currentTarget.style.opacity = '0.6')}
            onPointerUp={e => (e.currentTarget.style.opacity = '1')}
            onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Category grid */}
      <p style={{
        fontSize: '0.72rem', color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: '10px', fontFamily: "'Kalam', 'Itim', cursive",
      }}>
        หมวดหมู่
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {categories.map(cat => {
          const selected = catId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setCatId(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 4px',
                borderRadius: '14px',
                border: selected ? `2px solid ${cat.color}` : '1px solid var(--border)',
                background: selected ? `${cat.color}18` : 'var(--bg3)',
                cursor: 'pointer',
                boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {(() => { const Icon = CAT_ICONS[cat.id] ?? Tag; return <Icon size={22} color={selected ? cat.color : 'var(--text2)'} strokeWidth={1.6} /> })()}
              <span style={{
                fontSize: '0.65rem',
                color: selected ? cat.color : 'var(--text2)',
                fontWeight: 700,
                fontFamily: "'Kalam', 'Itim', cursive",
              }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Date + Note */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '0.72rem', color: 'var(--text2)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: '6px', fontFamily: "'Kalam', 'Itim', cursive",
          }}>วันที่</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg3)',
              color: 'var(--text)',
              fontFamily: "'Kalam', 'Itim', cursive",
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <p style={{
              fontSize: '0.72rem', color: 'var(--text2)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: "'Kalam', 'Itim', cursive",
            }}>โน้ต</p>
            <button
              onClick={() => setShowNote(s => !s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', color: 'var(--accent)',
                fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700,
              }}
            >
              {showNote ? 'ซ่อน' : 'เพิ่ม'}
            </button>
          </div>
          {showNote && (
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="รายละเอียด..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg3)',
                color: 'var(--text)',
                fontFamily: "'Kalam', 'Itim', cursive",
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid var(--red)',
          background: 'var(--red-fill)',
          color: 'var(--red)',
          fontSize: '0.82rem',
          fontFamily: "'Kalam', 'Itim', cursive",
          marginBottom: '12px',
        }}>
          {error}
        </div>
      )}

      {/* Auth debug */}
      {!uid && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid var(--amber)',
          background: 'var(--amber-fill)',
          color: 'var(--amber)',
          fontSize: '0.78rem',
          fontFamily: "'Kalam', 'Itim', cursive",
          marginBottom: '12px',
        }}>
          ⚠️ กำลังเชื่อมต่อ Firebase — ถ้าค้างนาน ให้ตรวจสอบว่าเปิด Anonymous Auth ใน Firebase Console แล้วหรือยัง
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={amount <= 0 || saving}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '10px',
          border: amount <= 0 ? '1px solid var(--border)' : `1px solid ${accentColor}`,
          background: amount <= 0 ? 'var(--bg3)' : accentColor,
          color: amount <= 0 ? 'var(--text2)' : '#fff',
          fontFamily: "'Kalam', 'Itim', cursive",
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: amount <= 0 ? 'not-allowed' : 'pointer',
          boxShadow: amount <= 0 ? 'none' : 'var(--shadow)',
          transition: 'all 0.2s',
        }}
      >
        {saving ? 'กำลังบันทึก...' : `บันทึก ${amount > 0 ? '฿' + fmt(amount) : ''}`}
      </button>

    </div>
  )
}
