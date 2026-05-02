import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBudget } from '../hooks/useBudget'
import { useTransactions } from '../hooks/useTransactions'
import { setBudget, deleteBudget } from '../lib/firestore'
import { useCategories } from '../contexts/CategoriesContext'
import { AlertCircle, AlertTriangle, X, Tag } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'
import ConfirmButton from '../components/ui/ConfirmButton'
import { useToast } from '../components/ui/Toast'

function fmt(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function thisMonthPrefix() {
  return new Date().toISOString().slice(0, 7)
}

export default function Budget() {
  const { uid } = useAuth()
  const { budgets } = useBudget()
  const { transactions } = useTransactions()
  const { toast } = useToast()
  const { categories } = useCategories()

  const [editCat, setEditCat] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)

  // spent per catId this month
  const spentByCat: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.date.startsWith(thisMonthPrefix()) && tx.amount < 0) {
      spentByCat[tx.catId] = (spentByCat[tx.catId] || 0) + Math.abs(tx.amount)
    }
  }

  // income this month (for 50/30/20 suggestion)
  const income = transactions
    .filter(tx => tx.date.startsWith(thisMonthPrefix()) && tx.amount > 0)
    .reduce((s, tx) => s + tx.amount, 0)

  const budgetMap = Object.fromEntries(budgets.map(b => [b.catId, b.limit]))

  const handleSave = async (catId: string) => {
    if (!uid) return
    const limit = parseFloat(editVal)
    if (!limit || limit <= 0) return
    setSaving(true)
    await setBudget(uid, catId, limit)
    setSaving(false)
    setEditCat(null)
    setEditVal('')
    toast('บันทึก budget แล้ว')
  }

  const handleDelete = async (catId: string) => {
    if (!uid) return
    await deleteBudget(uid, catId)
    toast('ลบ budget แล้ว')
  }

  const expenseCats = categories.filter(c => c.id !== 'income')

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 80px' }}>
      <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Budget</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '20px' }}>ติดตามรายจ่ายรายหมวดเดือนนี้</p>

      {/* 50/30/20 suggestion */}
      {income > 0 && (
        <div style={{
          background: 'var(--bg3)', borderRadius: '12px', padding: '14px 16px',
          marginBottom: '20px', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            แนะนำ 50/30/20 Rule (รายรับ ฿{fmt(income)})
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'จำเป็น 50%', color: 'var(--green)',  val: income * 0.5 },
              { label: 'ต้องการ 30%', color: 'var(--amber)', val: income * 0.3 },
              { label: 'ออม 20%',     color: 'var(--purple)', val: income * 0.2 },
            ].map(r => (
              <div key={r.label} style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text2)', marginBottom: '2px' }}>{r.label}</p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.9rem', fontWeight: 600, color: r.color }}>
                  ฿{fmt(r.val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category budget list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {expenseCats.map(cat => {
          const limit = budgetMap[cat.id] ?? 0
          const spent = spentByCat[cat.id] ?? 0
          const pct = limit > 0 ? Math.min(1, spent / limit) : 0
          const isEdit = editCat === cat.id
          const over = limit > 0 && spent > limit
          const warn = limit > 0 && pct >= 0.9 && !over

          const barColor = over ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--green)'

          return (
            <div
              key={cat.id}
              style={{
                background: 'var(--bg2)', borderRadius: '12px', padding: '14px 16px',
                border: `1px solid ${over ? 'rgba(220,38,38,0.3)' : 'var(--border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isEdit ? '12px' : limit > 0 ? '10px' : '0' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(() => { const Icon = CAT_ICONS[cat.id] ?? Tag; return <Icon size={15} color={cat.color} strokeWidth={1.8} /> })()}
                </div>
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)', fontSize: '0.9rem' }}>{cat.label}</span>

                {over && <AlertCircle size={15} color="var(--red)" />}
                {warn && <AlertTriangle size={15} color="var(--amber)" />}

                {!isEdit && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setEditCat(cat.id); setEditVal(limit > 0 ? String(limit) : '') }}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer',
                        fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {limit > 0 ? 'แก้' : '+ ตั้ง'}
                    </button>
                    {limit > 0 && (
                      <ConfirmButton onConfirm={() => handleDelete(cat.id)} size={13} />
                    )}
                  </div>
                )}
              </div>

              {/* Edit input */}
              {isEdit && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="number"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    placeholder="วงเงิน (บาท/เดือน)"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'var(--bg3)',
                      color: 'var(--text)', fontFamily: 'DM Mono, monospace', fontSize: '1rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => handleSave(cat.id)}
                    disabled={saving}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                      background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.85rem',
                    }}
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => { setEditCat(null); setEditVal('') }}
                    style={{
                      padding: '8px', borderRadius: '8px', border: '1px solid var(--border)',
                      background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Progress */}
              {limit > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>
                      ใช้ไป <span style={{ color: barColor, fontWeight: 600 }}>฿{fmt(spent)}</span>
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>
                      {over
                        ? <span style={{ color: 'var(--red)' }}>เกิน ฿{fmt(spent - limit)}</span>
                        : `เหลือ ฿${fmt(limit - spent)}`
                      } / ฿{fmt(limit)}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.min(pct * 100, 100)}%`,
                      background: barColor, borderRadius: '99px', transition: 'width 0.4s',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginTop: '4px', textAlign: 'right' }}>
                    {(pct * 100).toFixed(0)}%
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
