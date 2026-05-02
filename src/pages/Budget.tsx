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
import RoughProgress from '../components/ui/RoughProgress'

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

  const spentByCat: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.date.startsWith(thisMonthPrefix()) && tx.amount < 0) {
      spentByCat[tx.catId] = (spentByCat[tx.catId] || 0) + Math.abs(tx.amount)
    }
  }

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
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{
        fontFamily: "'Caveat', cursive",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '2px',
      }}>
        Budget 💰
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '20px', fontFamily: "'Kalam', 'Itim', cursive" }}>
        ติดตามรายจ่ายรายหมวดเดือนนี้
      </p>

      {/* 50/30/20 suggestion */}
      {income > 0 && (
        <div style={{
          background: 'var(--blue-fill)',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '20px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}>
          <p style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text2)',
            marginBottom: '10px',
          }}>
            ✏️ แนะนำ 50/30/20 Rule (รายรับ ฿{fmt(income)})
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'จำเป็น 50%', color: 'var(--green)',  val: income * 0.5 },
              { label: 'ต้องการ 30%', color: 'var(--amber)', val: income * 0.3 },
              { label: 'ออม 20%',     color: 'var(--purple)', val: income * 0.2 },
            ].map(r => (
              <div key={r.label} style={{
                flex: 1,
                textAlign: 'center',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 4px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '3px', fontFamily: "'Kalam', 'Itim', cursive" }}>{r.label}</p>
                <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem', fontWeight: 700, color: r.color }}>
                  ฿{fmt(r.val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category budget list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {expenseCats.map(cat => {
          const limit = budgetMap[cat.id] ?? 0
          const spent = spentByCat[cat.id] ?? 0
          const pct = limit > 0 ? Math.min(1, spent / limit) : 0
          const isEdit = editCat === cat.id
          const over = limit > 0 && spent > limit
          const warn = limit > 0 && pct >= 0.9 && !over

          const barColor = over ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--green)'
          const barHex = over ? '#e05a5a' : warn ? '#e8b800' : '#3d9b8a'

          return (
            <div
              key={cat.id}
              style={{
                background: over ? 'var(--red-fill)' : 'var(--bg2)',
                borderRadius: '14px',
                padding: '14px 16px',
                border: `1px solid ${over ? 'var(--red)' : 'var(--border)'}`,
                boxShadow: 'var(--shadow)',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isEdit ? '12px' : limit > 0 ? '10px' : '0' }}>
                {/* Category icon */}
                <div style={{
                  width: 34, height: 34,
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                  background: cat.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {(() => { const Icon = CAT_ICONS[cat.id] ?? Tag; return <Icon size={15} color={cat.color} strokeWidth={2.5} /> })()}
                </div>

                <span style={{
                  flex: 1,
                  fontFamily: "'Kalam', 'Itim', cursive",
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                }}>
                  {cat.label}
                </span>

                {over && <AlertCircle size={16} color="var(--red)" strokeWidth={2.5} />}
                {warn && <AlertTriangle size={16} color="var(--amber)" strokeWidth={2.5} />}

                {!isEdit && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setEditCat(cat.id); setEditVal(limit > 0 ? String(limit) : '') }}
                      style={{
                        padding: '4px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: 'var(--bg3)',
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontFamily: "'Kalam', 'Itim', cursive",
                        fontWeight: 700,
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translate(-1px, -1px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = ''
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                    >
                      {limit > 0 ? '✏️ แก้' : '+ ตั้ง'}
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
                      flex: 1,
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontFamily: "'Caveat', cursive",
                      fontSize: '1.1rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleSave(cat.id)}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      background: 'var(--accent)',
                      color: '#fdfcf7',
                      cursor: 'pointer',
                      fontFamily: "'Kalam', 'Itim', cursive",
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => { setEditCat(null); setEditVal('') }}
                    style={{
                      padding: '8px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--bg3)',
                      color: 'var(--text2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Progress */}
              {limit > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>
                      ใช้ไป <span style={{ color: barColor, fontWeight: 700 }}>฿{fmt(spent)}</span>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontFamily: "'Caveat', cursive", fontWeight: 700 }}>
                      {over
                        ? <span style={{ color: 'var(--red)' }}>เกิน ฿{fmt(spent - limit)}</span>
                        : `เหลือ ฿${fmt(limit - spent)}`
                      } / ฿{fmt(limit)}
                    </span>
                  </div>
                  <RoughProgress value={pct} color={barHex} height={14} />
                  <p style={{
                    fontSize: '0.72rem',
                    color: barColor,
                    marginTop: '4px',
                    textAlign: 'right',
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 700,
                  }}>
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
