import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useGoals } from '../hooks/useGoals'
import { useTransactions } from '../hooks/useTransactions'
import { addGoal, updateGoal, deleteGoal } from '../lib/firestore'
import DotChart from '../components/dashboard/DotChart'
import type { SavingsGoal } from '../types'
import ConfirmButton from '../components/ui/ConfirmButton'
import { useToast } from '../components/ui/Toast'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function thisMonthPrefix() {
  return new Date().toISOString().slice(0, 7)
}

function calcETA(goal: SavingsGoal): string {
  const remaining = goal.target - goal.saved
  if (remaining <= 0) return 'ถึงเป้าแล้ว! 🎉'
  if (!goal.monthlyAmount || goal.monthlyAmount <= 0) return '—'
  const months = Math.ceil(remaining / goal.monthlyAmount)
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
}

type Mode = 'pct' | 'fixed' | 'goals'
const MODE_LABELS: Record<Mode, string> = { pct: '% รายได้', fixed: 'ยอดคงที่', goals: 'เป้าหมาย' }

// ── GoalForm ──────────────────────────────────────────────────────────────────

interface GoalFormData { name: string; target: string; monthlyAmount: string; saved: string }
const EMPTY_FORM: GoalFormData = { name: '', target: '', monthlyAmount: '', saved: '0' }

function GoalForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: GoalFormData
  onSave: (d: GoalFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<GoalFormData>(initial ?? EMPTY_FORM)
  const set = (k: keyof GoalFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg3)',
    color: 'var(--text)', fontFamily: "'Caveat', cursive", fontSize: '1.05rem',
    outline: 'none', boxSizing: 'border-box',
  }
  const label = (txt: string) => (
    <p style={{ fontSize: '0.72rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive", marginBottom: '5px', fontWeight: 700 }}>{txt}</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg3)', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div>{label('ชื่อเป้าหมาย')}
        <input style={inputStyle} placeholder="เช่น ซื้อโน้ตบุ๊ก, ท่องเที่ยว..." value={form.name} onChange={set('name')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>{label('ยอดเป้าหมาย (฿)')}
          <input style={inputStyle} type="number" placeholder="100000" value={form.target} onChange={set('target')} /></div>
        <div>{label('ออม/เดือน (฿)')}
          <input style={inputStyle} type="number" placeholder="5000" value={form.monthlyAmount} onChange={set('monthlyAmount')} /></div>
      </div>
      <div>{label('ออมแล้ว (฿)')}
        <input style={inputStyle} type="number" placeholder="0" value={form.saved} onChange={set('saved')} /></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>ยกเลิก</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.target}
          style={{ flex: 2, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--purple)', color: '#fff', cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)', opacity: (!form.name || !form.target) ? 0.5 : 1 }}>
          {saving ? 'บันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Savings() {
  const { uid } = useAuth()
  const { goals } = useGoals()
  const { transactions } = useTransactions()
  const { toast } = useToast()

  const [mode, setMode] = useState<Mode>('goals')
  const [savingsPct, setSavingsPct] = useState(() => parseFloat(localStorage.getItem('zeery-savings-pct') ?? '20'))
  const [fixedAmt, setFixedAmt] = useState(() => parseFloat(localStorage.getItem('zeery-savings-fixed') ?? '0'))
  const [editPct, setEditPct] = useState(false)
  const [editFixed, setEditFixed] = useState(false)
  const [pctInput, setPctInput] = useState(String(savingsPct))
  const [fixedInput, setFixedInput] = useState(String(fixedAmt || ''))

  const [showAddForm, setShowAddForm] = useState(false)
  const [editGoalId, setEditGoalId] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // this month stats
  const monthTxs = transactions.filter(tx => tx.date.startsWith(thisMonthPrefix()))
  const income = useMemo(() => monthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), [monthTxs])
  const actualSaved = useMemo(() => monthTxs.filter(t => t.catId === 'savings').reduce((s, t) => s + Math.abs(t.amount), 0), [monthTxs])

  const targetPct = income * (savingsPct / 100)
  const pctDone = income > 0 ? Math.min(1, actualSaved / targetPct) : 0
  const fixedDone = fixedAmt > 0 ? Math.min(1, actualSaved / fixedAmt) : 0

  const savePct = () => {
    const v = parseFloat(pctInput)
    if (v > 0) { setSavingsPct(v); localStorage.setItem('zeery-savings-pct', String(v)) }
    setEditPct(false)
  }

  const saveFixed = () => {
    const v = parseFloat(fixedInput)
    if (v > 0) { setFixedAmt(v); localStorage.setItem('zeery-savings-fixed', String(v)) }
    setEditFixed(false)
  }

  const handleAddGoal = async (form: GoalFormData) => {
    if (!uid) return
    setFormSaving(true)
    await addGoal(uid, {
      name: form.name,
      target: parseFloat(form.target),
      saved: parseFloat(form.saved) || 0,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0,
    })
    setFormSaving(false)
    setShowAddForm(false)
    toast('เพิ่มเป้าหมายแล้ว')
  }

  const handleEditGoal = async (form: GoalFormData) => {
    if (!uid || !editGoalId) return
    setFormSaving(true)
    await updateGoal(uid, editGoalId, {
      name: form.name,
      target: parseFloat(form.target),
      saved: parseFloat(form.saved) || 0,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0,
    })
    setFormSaving(false)
    setEditGoalId(null)
    toast('บันทึกแล้ว')
  }

  const handleDeleteGoal = async (id: string) => {
    if (!uid) return
    await deleteGoal(uid, id)
    toast('ลบเป้าหมายแล้ว')
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: "'Caveat', cursive",
    fontSize: '1.1rem', outline: 'none', width: '120px', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{
        fontFamily: "'Caveat', cursive",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '2px',
      }}>ออมเงิน 🏦</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '20px', fontFamily: "'Kalam', 'Itim', cursive" }}>ติดตามเป้าออมเดือนนี้</p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '14px', padding: '4px', marginBottom: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px', borderRadius: '10px', border: mode === m ? '1px solid var(--border)' : '2px solid transparent', cursor: 'pointer',
            fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.82rem', fontWeight: 700,
            background: mode === m ? 'var(--bg2)' : 'transparent',
            color: mode === m ? 'var(--purple)' : 'var(--text2)',
            boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s',
          }}>{MODE_LABELS[m]}</button>
        ))}
      </div>

      {/* ── Mode 1: % รายได้ ── */}
      {mode === 'pct' && (
        <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.4rem' }}>🎯</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>ออม {savingsPct}% ของรายรับ</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>เป้า ฿{fmt(targetPct)} / เดือน</p>
            </div>
            <button onClick={() => setEditPct(e => !e)} style={{ padding: '5px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>✏️ แก้</button>
          </div>

          {editPct && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <input type="number" value={pctInput} onChange={e => setPctInput(e.target.value)} style={{ width: '80px', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: "'Caveat', cursive", fontSize: '1.2rem', outline: 'none' }} min="1" max="100" />
              <span style={{ alignSelf: 'center', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>%</span>
              <button onClick={savePct} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--purple)', color: '#fff', cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>บันทึก</button>
            </div>
          )}

          <DotChart type="fill" pct={pctDone} accent="var(--purple)" height={48} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: pctDone >= 1 ? 'var(--green)' : 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>
              ออมแล้ว ฿{fmt(actualSaved)} {pctDone >= 1 ? '✓' : ''}
            </span>
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '0.95rem', color: 'var(--purple)' }}>
              {(pctDone * 100).toFixed(0)}%
            </span>
          </div>
          {income === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--amber)', marginTop: '8px', fontFamily: "'Kalam', 'Itim', cursive" }}>⚠️ ยังไม่มีรายรับเดือนนี้</p>}
        </div>
      )}

      {/* ── Mode 2: ยอดคงที่ ── */}
      {mode === 'fixed' && (
        <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.4rem' }}>💰</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>ออม ฿{fmt(fixedAmt)} / เดือน</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>
                {fixedDone >= 1 ? '✅ ครบแล้วเดือนนี้!' : `เหลือ ฿${fmt(Math.max(0, fixedAmt - actualSaved))}`}
              </p>
            </div>
            <button onClick={() => setEditFixed(e => !e)} style={{ padding: '5px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>✏️ แก้</button>
          </div>

          {editFixed && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <input type="number" value={fixedInput} onChange={e => setFixedInput(e.target.value)} placeholder="5000" style={{ flex: 1, padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: "'Caveat', cursive", fontSize: '1.2rem', outline: 'none' }} />
              <span style={{ alignSelf: 'center', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>฿/เดือน</span>
              <button onClick={saveFixed} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--purple)', color: '#fff', cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>บันทึก</button>
            </div>
          )}

          <DotChart type="fill" pct={fixedDone} accent="var(--purple)" height={48} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: fixedDone >= 1 ? 'var(--green)' : 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>ออมแล้ว ฿{fmt(actualSaved)}</span>
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '0.95rem', color: 'var(--purple)' }}>{(fixedDone * 100).toFixed(0)}%</span>
          </div>
          {fixedAmt === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--amber)', marginTop: '8px', fontFamily: "'Kalam', 'Itim', cursive" }}>⚠️ กด "แก้" เพื่อตั้งยอดที่อยากออม</p>}
        </div>
      )}

      {/* ── Mode 3: เป้าหมาย ── */}
      {mode === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {goals.map(goal => {
            const pct = Math.min(1, goal.saved / goal.target)
            const isEditing = editGoalId === goal.id
            return (
              <div key={goal.id} style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                {isEditing ? (
                  <GoalForm
                    initial={{ name: goal.name, target: String(goal.target), monthlyAmount: String(goal.monthlyAmount), saved: String(goal.saved) }}
                    onSave={handleEditGoal}
                    onCancel={() => setEditGoalId(null)}
                    saving={formSaving}
                  />
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '1.3rem' }}>🎯</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '2px' }}>{goal.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>
                          ออม ฿{fmt(goal.monthlyAmount)}/เดือน · ถึง {calcETA(goal)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setEditGoalId(goal.id)} style={{ padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>✏️ แก้</button>
                        <ConfirmButton onConfirm={() => handleDeleteGoal(goal.id)} size={11} />
                      </div>
                    </div>

                    <DotChart type="fill" pct={pct} accent="var(--purple)" height={36} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem', color: 'var(--purple)', fontWeight: 700 }}>
                        ฿{fmt(goal.saved)}
                      </span>
                      <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text2)' }}>
                        {(pct * 100).toFixed(0)}% จาก ฿{fmt(goal.target)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Add form */}
          {showAddForm ? (
            <GoalForm onSave={handleAddGoal} onCancel={() => setShowAddForm(false)} saving={formSaving} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '14px', borderRadius: '14px', border: '2px dashed var(--border)',
                background: 'transparent', color: 'var(--text2)', cursor: 'pointer',
                fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.9rem', fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              + เพิ่มเป้าหมายใหม่
            </button>
          )}
        </div>
      )}
    </div>
  )
}
