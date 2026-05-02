import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useGoals } from '../hooks/useGoals'
import { subscribeRecurring, addRecurring, updateRecurring, deleteRecurring, addTransaction } from '../lib/firestore'
import { Timestamp } from 'firebase/firestore'
import type { Recurring } from '../types'
import { useCategories } from '../contexts/CategoriesContext'
import { RefreshCw, Play, Pencil, Tag } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'
import ConfirmButton from '../components/ui/ConfirmButton'
import { useToast } from '../components/ui/Toast'

function fmt(n: number) {
  return Math.abs(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

const TYPE_OPTS: { id: Recurring['type']; label: string; color: string; rgbVar: string }[] = [
  { id: 'expense', label: 'รายจ่าย', color: 'var(--red)',    rgbVar: 'var(--red-rgb)' },
  { id: 'income',  label: 'รายรับ',  color: 'var(--green)',  rgbVar: 'var(--green-rgb)' },
  { id: 'savings', label: 'โอนออม',  color: 'var(--purple)', rgbVar: 'var(--purple-rgb)' },
]

const DAY_OPTS = Array.from({ length: 31 }, (_, i) => i + 1)

type FormState = {
  id?: string
  name: string
  catId: string
  amount: string
  dayOfMonth: number
  type: Recurring['type']
  goalId: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '', catId: 'other', amount: '', dayOfMonth: 1, type: 'expense', goalId: '', active: true,
}

function todayYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function todayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10)
}

export default function Recurring() {
  const { uid } = useAuth()
  const { goals } = useGoals()
  const { toast } = useToast()
  const { categories } = useCategories()
  const [items, setItems] = useState<Recurring[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!uid) return
    return subscribeRecurring(uid, setItems)
  }, [uid])

  // Auto-create transactions on app load
  useEffect(() => {
    if (!uid || items.length === 0) return
    const now = new Date()
    const today = now.getDate()
    const yearMonth = todayYYYYMM()

    items.forEach(async item => {
      if (!item.active) return
      if (today < item.dayOfMonth) return

      const lastCreatedMonth = item.lastCreated
        ? new Date(item.lastCreated.toDate()).toISOString().slice(0, 7)
        : ''
      if (lastCreatedMonth === yearMonth) return

      // create transaction
      const amount = item.type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount)
      await addTransaction(uid, {
        name: item.name,
        catId: item.catId,
        amount,
        date: `${yearMonth}-${String(item.dayOfMonth).padStart(2, '0')}`,
        source: 'recurring',
      })
      await updateRecurring(uid, item.id, { lastCreated: Timestamp.now() })
    })
  }, [uid, items])

  const handleSave = async () => {
    if (!uid || !form) return
    const amount = parseFloat(form.amount)
    if (!form.name.trim() || isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      const data: Omit<Recurring, 'id'> = {
        name: form.name.trim(),
        catId: form.catId,
        amount,
        dayOfMonth: form.dayOfMonth,
        type: form.type,
        active: form.active,
        ...(form.goalId ? { goalId: form.goalId } : {}),
      }
      if (form.id) {
        await updateRecurring(uid, form.id, data)
        toast('แก้ไขรายการประจำแล้ว')
      } else {
        await addRecurring(uid, data)
        toast('เพิ่มรายการประจำแล้ว')
      }
      setForm(null)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: Recurring) => {
    if (!uid) return
    await updateRecurring(uid, item.id, { active: !item.active })
  }

  const handleDelete = async (id: string) => {
    if (!uid) return
    await deleteRecurring(uid, id)
    toast('ลบรายการประจำแล้ว')
  }

  const handleRunNow = async (item: Recurring) => {
    if (!uid) return
    const amount = item.type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount)
    await addTransaction(uid, {
      name: item.name,
      catId: item.catId,
      amount,
      date: todayYYYYMMDD(),
      source: 'recurring',
    })
    await updateRecurring(uid, item.id, { lastCreated: Timestamp.now() })
    toast(`บันทึก "${item.name}" แล้ว`)
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
        รายการประจำ 🔄
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '20px', fontFamily: "'Kalam', 'Itim', cursive" }}>
        รายรับ-รายจ่ายที่เกิดซ้ำทุกเดือน
      </p>

      {/* Add button */}
      <button
        onClick={() => setForm({ ...EMPTY_FORM })}
        style={{
          width: '100%', padding: '12px',
          borderRadius: '10px',
          border: '2px dashed var(--accent)',
          background: 'var(--accent-fill)',
          color: 'var(--accent)',
          fontWeight: 700,
          fontFamily: "'Kalam', 'Itim', cursive",
          fontSize: '0.95rem',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        + เพิ่มรายการประจำ
      </button>

      {/* List */}
      {items.length === 0 ? (
        <div style={{
          background: 'var(--bg2)',
          borderRadius: '14px',
          padding: '32px 16px',
          border: '2px dashed var(--border)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <RefreshCw size={32} strokeWidth={1.5} style={{ marginBottom: '8px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>ยังไม่มีรายการประจำ</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: '4px', fontFamily: "'Kalam', 'Itim', cursive" }}>
            เพิ่มรายการที่เกิดซ้ำทุกเดือน เช่น ค่าเช่า ค่าสมัคร streaming
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(item => {
            const typeInfo = TYPE_OPTS.find(t => t.id === item.type)!
            const cat = categories.find(c => c.id === item.catId)
            const yearMonth = todayYYYYMM()
            const lastMonth = item.lastCreated
              ? new Date(item.lastCreated.toDate()).toISOString().slice(0, 7)
              : ''
            const doneThisMonth = lastMonth === yearMonth
            const linkedGoal = goals.find(g => g.id === item.goalId)

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg2)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  border: `1px solid ${item.active ? 'var(--border)' : 'var(--bg3)'}`,
                  boxShadow: item.active ? 'var(--shadow-sm)' : 'none',
                  opacity: item.active ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                    background: (cat?.color ?? '#6b7280') + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '2px',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    {(() => { const Icon = CAT_ICONS[cat?.id ?? 'other'] ?? Tag; return <Icon size={16} color={cat?.color ?? '#6b7280'} strokeWidth={1.8} /> })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        fontWeight: 700, fontSize: '0.92rem',
                        color: 'var(--text)',
                        fontFamily: "'Kalam', 'Itim', cursive",
                      }}>{item.name}</span>
                      <span style={{
                        fontSize: '0.65rem', padding: '2px 7px',
                        borderRadius: '10px',
                        border: `1.5px solid ${typeInfo.color}`,
                        background: `${typeInfo.color}18`,
                        color: typeInfo.color, fontWeight: 700,
                        fontFamily: "'Kalam', 'Itim', cursive",
                      }}>
                        {typeInfo.label}
                      </span>
                      {doneThisMonth && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--green)', fontFamily: "'Kalam', 'Itim', cursive" }}>✓ เดือนนี้แล้ว</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: "'Caveat', cursive",
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: item.type === 'income' ? 'var(--green)' : item.type === 'savings' ? 'var(--purple)' : 'var(--red)',
                      }}>
                        {item.type === 'income' ? '+' : '-'}฿{fmt(item.amount)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>
                        ทุกวันที่ {item.dayOfMonth}
                      </span>
                      {linkedGoal && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--purple)', fontFamily: "'Kalam', 'Itim', cursive" }}>→ {linkedGoal.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(item)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: `1px solid ${item.active ? 'var(--green)' : 'var(--border)'}`,
                        background: item.active ? 'var(--green-fill)' : 'var(--bg3)',
                        color: item.active ? 'var(--green)' : 'var(--text2)',
                        fontSize: '0.72rem',
                        fontFamily: "'Kalam', 'Itim', cursive",
                        fontWeight: 700,
                      }}
                    >
                      {item.active ? 'เปิด' : 'หยุด'}
                    </button>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleRunNow(item)}
                        title="บันทึกทันที"
                        style={{
                          padding: '4px 7px', borderRadius: '8px', cursor: 'pointer',
                          border: '1px solid var(--border)', background: 'var(--bg3)',
                          color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      ><Play size={11} strokeWidth={2} /></button>
                      <button
                        onClick={() => setForm({
                          id: item.id, name: item.name, catId: item.catId,
                          amount: String(item.amount), dayOfMonth: item.dayOfMonth,
                          type: item.type, goalId: item.goalId ?? '', active: item.active,
                        })}
                        style={{
                          padding: '4px 7px', borderRadius: '8px', cursor: 'pointer',
                          border: '1px solid var(--border)', background: 'var(--bg3)',
                          color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      ><Pencil size={11} strokeWidth={2} /></button>
                      <ConfirmButton onConfirm={() => handleDelete(item.id)} size={11} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {form && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
          }}
          onClick={e => { if (e.target === e.currentTarget) setForm(null) }}
        >
          <div style={{
            background: 'var(--bg2)',
            borderRadius: '20px 20px 0 0',
            borderTop: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            padding: '24px 20px 40px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <p style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              fontSize: '1.4rem',
              color: 'var(--text)',
              marginBottom: '20px',
            }}>
              {form.id ? '✏️ แก้ไข' : '+ เพิ่ม'}รายการประจำ
            </p>

            {/* Type */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {TYPE_OPTS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => f ? { ...f, type: t.id } : f)}
                  style={{
                    flex: 1, padding: '8px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: `1px solid ${form.type === t.id ? t.color : 'var(--border)'}`,
                    background: form.type === t.id ? `${t.color}18` : 'var(--bg3)',
                    color: form.type === t.id ? t.color : 'var(--text2)',
                    fontSize: '0.82rem',
                    fontFamily: "'Kalam', 'Itim', cursive",
                    fontWeight: 700,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Name */}
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '6px', fontFamily: "'Kalam', 'Itim', cursive" }}>ชื่อรายการ</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
              placeholder="เช่น ค่าเช่า, Netflix"
              autoFocus
              style={inputStyle}
            />

            {/* Amount */}
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '6px', marginTop: '14px', fontFamily: "'Kalam', 'Itim', cursive" }}>จำนวนเงิน (บาท)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => f ? { ...f, amount: e.target.value } : f)}
              placeholder="0"
              style={{ ...inputStyle, fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
            />

            {/* Category */}
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '8px', marginTop: '14px', fontFamily: "'Kalam', 'Itim', cursive" }}>หมวดหมู่</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {(form.type === 'income'
                ? categories.filter(c => c.id === 'income' || c.id === 'other')
                : expenseCats
              ).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setForm(f => f ? { ...f, catId: cat.id } : f)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: `1px solid ${form.catId === cat.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.catId === cat.id ? 'var(--accent)' : 'var(--bg3)',
                    color: form.catId === cat.id ? '#fff' : 'var(--text2)',
                    fontSize: '0.78rem',
                    fontFamily: "'Kalam', 'Itim', cursive",
                    fontWeight: 700,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Day of month */}
            <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '6px', fontFamily: "'Kalam', 'Itim', cursive" }}>วันที่ตัดทุกเดือน</label>
            <select
              value={form.dayOfMonth}
              onChange={e => setForm(f => f ? { ...f, dayOfMonth: Number(e.target.value) } : f)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {DAY_OPTS.map(d => (
                <option key={d} value={d}>วันที่ {d}</option>
              ))}
            </select>

            {/* Link goal (savings only) */}
            {form.type === 'savings' && goals.length > 0 && (
              <>
                <label style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block', marginBottom: '6px', marginTop: '14px', fontFamily: "'Kalam', 'Itim', cursive" }}>เชื่อมกับเป้าออม (optional)</label>
                <select
                  value={form.goalId}
                  onChange={e => setForm(f => f ? { ...f, goalId: e.target.value } : f)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">-- ไม่เชื่อม --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)', color: '#fff',
                  fontWeight: 700,
                  fontFamily: "'Kalam', 'Itim', cursive",
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={() => setForm(null)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text2)',
                  fontFamily: "'Kalam', 'Itim', cursive",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid var(--border)', background: 'var(--bg3)',
  color: 'var(--text)', fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.95rem',
  outline: 'none', boxSizing: 'border-box',
}
