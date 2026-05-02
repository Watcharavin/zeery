import { useState } from 'react'
import { useCategories } from '../../contexts/CategoriesContext'
import type { Category } from '../../types'
import type { SlipData } from '../../lib/claude'

interface Props {
  slip: SlipData
  imgSrc: string
  onConfirm: (data: { amount: number; catId: string; date: string; note: string }) => void
  onCancel: () => void
}

export default function SlipConfirm({ slip, imgSrc, onConfirm, onCancel }: Props) {
  const { categories } = useCategories()
  const [amount, setAmount] = useState(String(slip.amount ?? ''))
  const [catId, setCatId] = useState<Category['id']>(slip.suggestCat ?? 'other')
  const [date, setDate] = useState(slip.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(
    [slip.receiver, slip.bank, slip.ref ? `ref:${slip.ref}` : ''].filter(Boolean).join(' · ')
  )

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg3)',
    color: 'var(--text)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const fieldLabel: React.CSSProperties = {
    fontSize: '0.72rem',
    color: 'var(--text2)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    display: 'block',
  }

  const handleConfirm = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    onConfirm({ amount: amt, catId, date, note: note.trim() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Preview */}
      <img
        src={imgSrc}
        alt="slip"
        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg3)' }}
      />

      {/* Amount */}
      <div>
        <span style={fieldLabel}>จำนวนเงิน (บาท)</span>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '1.4rem', fontWeight: 600 }}
        />
      </div>

      {/* Category */}
      <div>
        <span style={fieldLabel}>หมวดหมู่</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {categories.filter(c => c.id !== 'income').map(cat => {
            const sel = catId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCatId(cat.id)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: sel ? `2px solid ${cat.color}` : '2px solid transparent',
                  background: sel ? `${cat.color}18` : 'var(--bg3)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{cat.emoji}</span>
                <span style={{ fontSize: '0.62rem', color: sel ? cat.color : 'var(--text2)', fontWeight: sel ? 600 : 400 }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <div>
        <span style={fieldLabel}>วันที่</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      </div>

      {/* Note */}
      <div>
        <span style={fieldLabel}>โน้ต</span>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="ผู้รับ / ธนาคาร / อ้างอิง"
          style={inputStyle}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', fontWeight: 600,
          }}
        >
          ยกเลิก
        </button>
        <button
          onClick={handleConfirm}
          style={{
            flex: 2, padding: '14px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', fontWeight: 700,
          }}
        >
          นำเข้า ฿{parseFloat(amount || '0').toLocaleString('th-TH')}
        </button>
      </div>
    </div>
  )
}
