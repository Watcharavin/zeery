import { useOutletContext, useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { useBudget } from '../hooks/useBudget'
import { useGoals } from '../hooks/useGoals'
import DotChart from '../components/dashboard/DotChart'
import { useCategories } from '../contexts/CategoriesContext'
import type { Transaction, SavingsGoal, Budget } from '../types'
import { Camera, Plus, Tag } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function filterPeriod(txs: Transaction[], period: 'weekly' | 'monthly'): Transaction[] {
  const now = new Date()
  if (period === 'monthly') {
    const prefix = now.toISOString().slice(0, 7) // YYYY-MM
    return txs.filter(tx => tx.date.startsWith(prefix))
  }
  // weekly: Mon–today
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const monStr = mon.toISOString().split('T')[0]
  return txs.filter(tx => tx.date >= monStr && tx.date <= todayStr())
}

function getPrevPeriod(txs: Transaction[], period: 'weekly' | 'monthly'): Transaction[] {
  const now = new Date()
  if (period === 'monthly') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prefix = prev.toISOString().slice(0, 7)
    return txs.filter(tx => tx.date.startsWith(prefix))
  }
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const prevMon = new Date(mon)
  prevMon.setDate(prevMon.getDate() - 7)
  const prevSun = new Date(mon)
  prevSun.setDate(prevSun.getDate() - 1)
  const a = prevMon.toISOString().split('T')[0]
  const b = prevSun.toISOString().split('T')[0]
  return txs.filter(tx => tx.date >= a && tx.date <= b)
}

function barData(txs: Transaction[], cols: number, sign: 1 | -1): number[] {
  const dates: string[] = []
  for (let i = cols - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  const grouped: Record<string, number> = {}
  for (const tx of txs) {
    if (sign === 1 ? tx.amount > 0 : tx.amount < 0) {
      grouped[tx.date] = (grouped[tx.date] || 0) + Math.abs(tx.amount)
    }
  }
  const vals = dates.map(d => grouped[d] || 0)
  const max = Math.max(...vals, 1)
  return vals.map(v => v / max)
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / prev) * 100
}

function calcETA(goal: SavingsGoal): string {
  const remaining = goal.target - goal.saved
  if (remaining <= 0) return 'ถึงเป้าแล้ว'
  if (!goal.monthlyAmount || goal.monthlyAmount <= 0) return '—'
  const months = Math.ceil(remaining / goal.monthlyAmount)
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
}

// ── styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg2)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow)',
  padding: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const label: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text2)',
  fontFamily: "'Kalam', 'Itim', cursive",
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.09em',
}

const amount: React.CSSProperties = {
  fontFamily: "'Caveat', cursive",
  fontSize: '2rem',
  fontWeight: 700,
  color: 'var(--text)',
  lineHeight: 1,
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { getCat } = useCategories()
  const { period } = useOutletContext<{ period: 'weekly' | 'monthly' }>()
  const { transactions, loading } = useTransactions()
  const { budgets } = useBudget()
  const { goals } = useGoals()
  const navigate = useNavigate()

  const periodTxs = filterPeriod(transactions, period)
  const prevTxs = getPrevPeriod(transactions, period)

  const income = periodTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(periodTxs.filter(t => t.amount < 0 && t.catId !== 'savings').reduce((s, t) => s + t.amount, 0))
  const savings = Math.abs(periodTxs.filter(t => t.catId === 'savings').reduce((s, t) => s + t.amount, 0))
  const balance = income - expense - savings

  const prevIncome = prevTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const incomeChg = pctChange(income, prevIncome)

  const cols = 28
  const incomeBar = barData(transactions, cols, 1)
  const expenseBar = barData(transactions, cols, -1)
  const balancePct = income > 0 ? Math.max(0, Math.min(1, (balance + savings) / income)) : 0
  const savingsPct = income > 0 && savings > 0 ? Math.round((savings / income) * 100) : 0

  // Budget: compute spent per catId this period
  const spentByCat: Record<string, number> = {}
  for (const tx of periodTxs) {
    if (tx.amount < 0) {
      spentByCat[tx.catId] = (spentByCat[tx.catId] || 0) + Math.abs(tx.amount)
    }
  }

  const budgetItems = budgets
    .map((b: Budget) => ({ ...b, spent: spentByCat[b.catId] || 0, cat: getCat(b.catId) }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3)

  const latest = transactions.slice(0, 3)
  const top2Goals = goals.slice(0, 2)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '20px',
      }}
      className="dashboard-grid page-content-wide"
    >

      {/* ── Net Balance Hero (4 col) ────────────────────────────── */}
      <div style={{
        ...card,
        gridColumn: 'span 4',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '24px 28px',
        gap: '0',
        borderLeft: `4px solid ${balance >= 0 ? 'var(--green)' : 'var(--red)'}`,
        background: `linear-gradient(135deg, ${balance >= 0 ? 'rgba(45,155,135,0.07)' : 'rgba(217,82,82,0.07)'} 0%, transparent 55%)`,
      }}>
        <div style={{ flex: 1 }}>
          <span style={{ ...label, marginBottom: '8px', display: 'block' }}>
            {period === 'monthly' ? 'คงเหลือเดือนนี้' : 'คงเหลือสัปดาห์นี้'}
          </span>
          <span style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '3rem',
            fontWeight: 700,
            color: balance >= 0 ? 'var(--green)' : 'var(--red)',
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}>
            {balance >= 0 ? '+' : '-'}฿{fmt(Math.abs(balance))}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
          <div style={{ textAlign: 'right', padding: '0 20px' }}>
            <p style={{ ...label, marginBottom: '6px' }}>รายรับ</p>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>฿{fmt(income)}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
          <div style={{ textAlign: 'right', padding: '0 0 0 20px' }}>
            <p style={{ ...label, marginBottom: '6px' }}>รายจ่าย</p>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>฿{fmt(expense)}</p>
          </div>
          {savingsPct > 0 && <>
            <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', margin: '0 0 0 20px' }} />
            <div style={{ textAlign: 'right', padding: '0 0 0 20px' }}>
              <p style={{ ...label, marginBottom: '6px' }}>ออม</p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.4rem', fontWeight: 700, color: 'var(--purple)' }}>{savingsPct}%</p>
            </div>
          </>}
        </div>
      </div>

      {/* ── รายรับ (2 col) ─────────────────────────────────────── */}
      <div style={{ ...card, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={label}>รายรับ</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              fontFamily: "'Kalam', 'Itim', cursive",
              padding: '2px 8px',
              borderRadius: '10px',
              background: incomeChg >= 0 ? 'var(--green-fill)' : 'var(--red-fill)',
              color: incomeChg >= 0 ? 'var(--green)' : 'var(--red)',
              border: `1.5px solid ${incomeChg >= 0 ? 'var(--green)' : 'var(--red)'}`,
            }}
          >
            {incomeChg >= 0 ? '+' : ''}{incomeChg.toFixed(1)}%
          </span>
        </div>
        <span style={{ ...amount, color: 'var(--green)' }}>฿{fmt(income)}</span>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DotChart type="bar" data={incomeBar} accent="var(--green)" height={52} />
        </div>
      </div>

      {/* ── รายจ่าย (1 col) ────────────────────────────────────── */}
      <div style={card}>
        <span style={label}>รายจ่าย</span>
        <span style={{ ...amount, color: 'var(--accent)' }}>฿{fmt(expense)}</span>
        <div style={{ flex: 1, minHeight: 0 }}>
          <DotChart type="bar" data={expenseBar} accent="var(--red)" height={52} />
        </div>
      </div>

      {/* ── คงเหลือ (1 col) ────────────────────────────────────── */}
      <div style={{ ...card, alignItems: 'center', gap: '6px' }}>
        <span style={label}>คงเหลือ</span>
        <div style={{ width: '96px', height: '96px', margin: '4px 0' }}>
          <DotChart type="ring" pct={balancePct} accent="var(--accent)" height={96} />
        </div>
        <span style={{ ...amount, fontSize: '1.3rem' }}>฿{fmt(balance)}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text2)', fontFamily: "'Kalam','Itim',cursive" }}>
          {income > 0 ? (balancePct * 100).toFixed(0) : 0}% ของรายรับ
        </span>
      </div>

      {/* ── Budget (1 col) ─────────────────────────────────────── */}
      <div style={card}>
        <span style={label}>Budget</span>
        {loading || budgetItems.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text2)' }}>
            <span style={{ fontSize: '1.6rem' }}>📋</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{loading ? 'กำลังโหลด…' : 'ยังไม่ได้ตั้ง budget'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2px' }}>
            {budgetItems.map(b => {
              const pct = Math.min(1, b.spent / b.limit)
              const color = pct >= 1 ? 'var(--red)' : pct >= 0.9 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={b.catId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', fontFamily: "'Kalam','Itim',cursive" }}>
                      {(() => { const Icon = CAT_ICONS[b.cat.id] ?? Tag; return <Icon size={13} color={b.cat.color} strokeWidth={2} /> })()}
                      {b.cat.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: pct >= 1 ? 'var(--red)' : 'var(--text2)', fontFamily: "'Caveat', cursive", fontWeight: 700 }}>
                      {fmt(b.spent)}/{fmt(b.limit)}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── เป้าออม (1 col) ────────────────────────────────────── */}
      <div style={card}>
        <span style={label}>เป้าออม</span>
        {top2Goals.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text2)' }}>
            <span style={{ fontSize: '1.6rem' }}>🎯</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>ยังไม่มีเป้าหมาย</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {top2Goals.map((g: SavingsGoal) => {
              const pct = Math.min(1, g.saved / g.target)
              const done = pct >= 1
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, marginLeft: '6px',
                      fontFamily: "'Caveat', cursive",
                      color: done ? 'var(--green)' : 'var(--purple)',
                    }}>
                      {(pct * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct * 100}%`,
                      background: done ? 'var(--green)' : 'var(--purple)',
                      borderRadius: '99px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text2)', fontFamily: "'Caveat', cursive" }}>
                      ฿{fmt(g.saved)} / ฿{fmt(g.target)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text2)' }}>{calcETA(g)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ล่าสุด (2 col) ─────────────────────────────────────── */}
      <div style={{ ...card, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={label}>รายการล่าสุด</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => navigate('/slip')}
              style={{
                background: 'var(--bg3)', color: 'var(--text2)',
                border: '1px solid var(--border)', borderRadius: '10px',
                padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive",
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Camera size={13} strokeWidth={2} /> Slip
            </button>
            <button
              onClick={() => navigate('/add')}
              style={{
                background: 'var(--accent)', color: '#fff',
                border: '1px solid var(--border)', borderRadius: '10px',
                padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Kalam', 'Itim', cursive",
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> เพิ่ม
            </button>
          </div>
        </div>

        {latest.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px 0' }}>
            <span style={{ fontSize: '2rem' }}>💸</span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>ยังไม่มีรายการ</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '4px' }}>เพิ่มรายการหรือสแกน slip เพื่อเริ่มต้น</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => navigate('/slip')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Kalam','Itim',cursive" }}>
                <Camera size={14} strokeWidth={2} /> Slip
              </button>
              <button onClick={() => navigate('/add')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Kalam','Itim',cursive" }}>
                <Plus size={14} strokeWidth={2.5} /> เพิ่มรายการ
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {latest.map(tx => {
              const cat = getCat(tx.catId)
              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    transition: 'background 0.12s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                    background: cat.color + '1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(() => { const Icon = CAT_ICONS[cat.id] ?? Tag; return <Icon size={16} color={cat.color} strokeWidth={2} /> })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Kalam','Itim',cursive", fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ background: cat.color + '18', color: cat.color, padding: '1px 6px', borderRadius: '20px', fontSize: '0.63rem', fontWeight: 700, fontFamily: "'Kalam','Itim',cursive" }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text2)' }}>{tx.date}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Caveat',cursive", fontSize: '1.05rem', fontWeight: 700, color: tx.amount > 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                    {tx.amount > 0 ? '+' : ''}฿{fmt(Math.abs(tx.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
