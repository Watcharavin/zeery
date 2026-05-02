import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribeTransactions } from '../lib/firestore'
import { where } from 'firebase/firestore'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useCategories } from '../contexts/CategoriesContext'
import type { Transaction } from '../types'

type Period = 'week' | 'month' | 'year'

function fmt(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function getDateRange(period: Period): { since: string; labels: string[] } {
  const now = new Date()
  if (period === 'week') {
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    return { since: days[0], labels: days }
  }
  if (period === 'month') {
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.toISOString().slice(0, 7))
    }
    return { since: months[0] + '-01', labels: months }
  }
  // year — last 12 months
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return { since: months[0] + '-01', labels: months }
}

function shortLabel(label: string, period: Period) {
  if (period === 'week') return label.slice(5) // MM-DD
  if (period === 'month' || period === 'year') return label.slice(5) // MM
  return label
}

export default function Report() {
  const { uid } = useAuth()
  const { categories } = useCategories()
  const [period, setPeriod] = useState<Period>('month')
  const [txs, setTxs] = useState<Transaction[]>([])

  const { since, labels } = getDateRange(period)

  useEffect(() => {
    if (!uid) return
    return subscribeTransactions(uid, setTxs, [where('date', '>=', since)])
  }, [uid, since])

  // Build chart data
  const chartData = labels.map(label => {
    let income = 0, expense = 0, savings = 0
    for (const tx of txs) {
      const key = period === 'week' ? tx.date : tx.date.slice(0, 7)
      if (key !== label) continue
      if (tx.catId === 'savings') { savings += Math.abs(tx.amount); continue }
      if (tx.amount > 0) income += tx.amount
      else expense += Math.abs(tx.amount)
    }
    return { label: shortLabel(label, period), income, expense, savings }
  })

  // Category breakdown (all time in range)
  const catSpend: Record<string, number> = {}
  let totalIncome = 0, totalExpense = 0, totalSavings = 0
  for (const tx of txs) {
    if (tx.catId === 'savings') { totalSavings += Math.abs(tx.amount); continue }
    if (tx.amount > 0) totalIncome += tx.amount
    else {
      totalExpense += Math.abs(tx.amount)
      catSpend[tx.catId] = (catSpend[tx.catId] || 0) + Math.abs(tx.amount)
    }
  }

  const catList = Object.entries(catSpend)
    .map(([id, amount]) => ({ id, amount, cat: categories.find(c => c.id === id) }))
    .filter(x => x.cat)
    .sort((a, b) => b.amount - a.amount)

  // Compare with previous period (simple: compare totals)
  const prevData = (() => {
    return { income: 0, expense: 0 }
  })()

  const incomeDelta = prevData.income > 0 ? ((totalIncome - prevData.income) / prevData.income * 100) : null
  const expenseDelta = prevData.expense > 0 ? ((totalExpense - prevData.expense) / prevData.expense * 100) : null

  const periodLabel = period === 'week' ? '7 วัน' : period === 'month' ? '6 เดือน' : '12 เดือน'

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{
        fontFamily: "'Caveat', cursive",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '2px',
      }}>
        รายงาน 📊
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '16px', fontFamily: "'Kalam', 'Itim', cursive" }}>
        สรุปรายรับ-รายจ่าย
      </p>

      {/* Period toggle */}
      <div style={{
        display: 'flex',
        background: 'var(--bg2)',
        borderRadius: '14px',
        padding: '4px',
        gap: '4px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {([['week', '7 วัน'], ['month', '6 เดือน'], ['year', '12 เดือน']] as const).map(([p, l]) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1, padding: '8px',
              borderRadius: period === p ? '10px' : '8px',
              cursor: 'pointer',
              border: period === p ? '1px solid var(--accent)' : '1px solid transparent',
              background: period === p ? 'var(--accent)' : 'transparent',
              color: period === p ? '#fff' : 'var(--text2)',
              fontFamily: "'Kalam', 'Itim', cursive",
              fontWeight: 700,
              fontSize: '0.85rem',
              transition: 'all 0.15s',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'รายรับ', value: totalIncome, color: 'var(--green)', delta: incomeDelta },
          { label: 'รายจ่าย', value: totalExpense, color: 'var(--red)', delta: expenseDelta },
          { label: 'ออม', value: totalSavings, color: 'var(--purple)', delta: null },
        ].map(card => (
          <div key={card.label} style={{
            flex: 1,
            background: 'var(--bg2)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '4px', fontFamily: "'Kalam', 'Itim', cursive" }}>{card.label}</p>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem', fontWeight: 700, color: card.color }}>
              ฿{fmt(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div style={{
        background: 'var(--bg2)',
        borderRadius: '14px',
        padding: '16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        marginBottom: '24px',
      }}>
        <p style={{
          fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '12px',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: "'Kalam', 'Itim', cursive",
        }}>
          แนวโน้ม {periodLabel}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text2)' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <Tooltip
              formatter={(v) => [`฿${fmt(Number(v))}`, '']}
              contentStyle={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '0.78rem',
                color: 'var(--text)',
                fontFamily: "'Kalam', 'Itim', cursive",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text2)', paddingTop: '8px', fontFamily: "'Kalam', 'Itim', cursive" }}
              formatter={v => ({ income: 'รายรับ', expense: 'รายจ่าย', savings: 'ออม' }[v as string] ?? v)}
            />
            <Line type="monotone" dataKey="income" stroke="var(--green)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" stroke="var(--red)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="savings" stroke="var(--purple)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {catList.length > 0 && (
        <div style={{
          background: 'var(--bg2)',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}>
          <p style={{
            fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '14px',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            fontFamily: "'Kalam', 'Itim', cursive",
          }}>
            รายจ่ายแยกหมวด
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {catList.map(({ id, amount, cat }) => {
              const pct = totalExpense > 0 ? amount / totalExpense : 0
              return (
                <div key={id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat!.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700, fontFamily: "'Kalam', 'Itim', cursive" }}>{cat!.label}</span>
                    <span style={{ fontFamily: "'Caveat', cursive", fontSize: '0.85rem', color: 'var(--text2)' }}>
                      {(pct * 100).toFixed(1)}%
                    </span>
                    <span style={{ fontFamily: "'Caveat', cursive", fontSize: '0.9rem', fontWeight: 700, color: 'var(--red)' }}>
                      ฿{fmt(amount)}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%', width: `${pct * 100}%`,
                      background: cat!.color, borderRadius: '99px', transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Net summary */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>รายรับ − รายจ่าย</span>
              <span style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '1.1rem',
                fontWeight: 700,
                color: totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {totalIncome - totalExpense >= 0 ? '+' : ''}฿{fmt(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
        </div>
      )}

      {txs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          color: 'var(--text2)', fontSize: '0.85rem',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</p>
          <p style={{ fontFamily: "'Kalam', 'Itim', cursive" }}>ยังไม่มีข้อมูลในช่วงนี้</p>
        </div>
      )}
    </div>
  )
}
