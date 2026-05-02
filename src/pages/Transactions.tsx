import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribeTransactions, deleteTransaction, monthRange } from '../lib/firestore'
import { useCategories } from '../contexts/CategoriesContext'
import type { Transaction } from '../types'
import { useNavigate } from 'react-router-dom'
import { Camera, RotateCcw, Plus, Tag, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'
import ConfirmButton from '../components/ui/ConfirmButton'
import { useToast } from '../components/ui/Toast'

function fmt(n: number) {
  return Math.abs(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function groupByDate(txs: Transaction[]) {
  const map: Record<string, Transaction[]> = {}
  for (const tx of txs) {
    if (!map[tx.date]) map[tx.date] = []
    map[tx.date].push(tx)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Transactions() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { categories, getCat } = useCategories()

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    const [y, m] = selectedMonth.split('-').map(Number)
    const unsub = subscribeTransactions(uid, txs => {
      setTransactions(txs)
      setLoading(false)
    }, monthRange(y, m))
    return unsub
  }, [uid, selectedMonth])

  // Filter
  const filtered = transactions.filter(tx => {
    if (filterType === 'income' && tx.amount <= 0) return false
    if (filterType === 'expense' && tx.amount >= 0) return false
    if (filterCat && tx.catId !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!tx.name.toLowerCase().includes(q) && !(tx.note ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const groups = groupByDate(filtered)

  const handleDelete = async (id: string) => {
    if (!uid) return
    setDeleting(id)
    await deleteTransaction(uid, id)
    setDeleting(null)
    toast('ลบรายการแล้ว')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
        <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)' }}>รายการ 📋</h1>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2px 6px', boxShadow: 'var(--shadow-sm)' }}>
          <button
            onClick={() => setSelectedMonth(m => addMonths(m, -1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex' }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span style={{ fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, fontSize: '0.78rem', color: 'var(--text)', minWidth: 90, textAlign: 'center' }}>
            {fmtMonthLabel(selectedMonth)}
          </span>
          <button
            onClick={() => setSelectedMonth(m => addMonths(m, 1))}
            disabled={selectedMonth >= currentYearMonth()}
            style={{
              background: 'none', border: 'none', cursor: selectedMonth >= currentYearMonth() ? 'not-allowed' : 'pointer',
              color: selectedMonth >= currentYearMonth() ? 'var(--border)' : 'var(--text2)',
              padding: '4px', display: 'flex',
            }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
        <button
          onClick={() => navigate('/add')}
          style={{
            padding: '7px 14px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--accent)', color: '#fdfcf7',
            fontWeight: 700, fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.82rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Plus size={14} strokeWidth={2.5} /> เพิ่ม
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 ค้นหารายการ..."
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--bg2)',
          color: 'var(--text)', fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.95rem',
          outline: 'none', boxSizing: 'border-box', marginBottom: '10px',
          boxShadow: 'var(--shadow-sm)',
        }}
      />

      {/* Filter row */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
        {/* Type filter */}
        {([['all', 'ทั้งหมด'], ['income', 'รายรับ'], ['expense', 'รายจ่าย']] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterType(v)}
            style={{
              padding: '5px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', cursor: 'pointer',
              background: filterType === v ? 'var(--accent)' : 'var(--bg2)',
              color: filterType === v ? '#fdfcf7' : 'var(--text2)',
              fontSize: '0.78rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700,
              whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: filterType === v ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {l}
          </button>
        ))}

        <div style={{ width: '2px', background: 'var(--border)', flexShrink: 0, borderRadius: '2px' }} />

        {/* Category filter */}
        <button
          onClick={() => setFilterCat('')}
          style={{
            padding: '5px 12px', borderRadius: '10px',
            border: `1px solid ${filterCat === '' ? 'var(--border)' : 'transparent'}`, cursor: 'pointer',
            background: filterCat === '' ? 'var(--bg3)' : 'var(--bg2)',
            color: filterCat === '' ? 'var(--text)' : 'var(--text2)',
            fontSize: '0.78rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: filterCat === '' ? 700 : 400,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          ทุกหมวด
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
            style={{
              padding: '5px 12px', borderRadius: '10px',
              border: `1px solid ${filterCat === cat.id ? cat.color + '88' : 'transparent'}`, cursor: 'pointer',
              background: filterCat === cat.id ? cat.color + '22' : 'var(--bg2)',
              color: filterCat === cat.id ? cat.color : 'var(--text2)',
              fontSize: '0.78rem', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: filterCat === cat.id ? 700 : 400,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex', gap: '10px', marginBottom: '16px',
          background: 'var(--bg2)', borderRadius: '14px', padding: '10px 14px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        }}>
          {[
            { label: 'รายการ', value: filtered.length.toString(), color: 'var(--text)' },
            {
              label: 'รายรับ',
              value: '฿' + filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
              color: 'var(--green)',
            },
            {
              label: 'รายจ่าย',
              value: '฿' + filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
              color: 'var(--red)',
            },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text2)', marginBottom: '2px', fontFamily: "'Kalam', 'Itim', cursive" }}>{s.label}</p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem', fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Groups */}
      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text2)' }}>
          <ClipboardList size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.95rem', color: 'var(--text2)' }}>
            {filtered.length === 0 && transactions.length > 0 ? 'ไม่พบรายการที่ตรงกัน' : `ไม่มีรายการใน${fmtMonthLabel(selectedMonth)}`}
          </p>
          {selectedMonth === currentYearMonth() && transactions.length === 0 && (
            <button
              onClick={() => navigate('/add')}
              style={{
                marginTop: '12px', padding: '10px 24px',
                borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--accent)', color: '#fdfcf7',
                fontWeight: 700, fontFamily: "'Kalam', 'Itim', cursive", fontSize: '0.88rem',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              + เพิ่มรายการแรก
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groups.map(([date, txList]) => {
            const dayIncome = txList.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
            const dayExpense = txList.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
            return (
              <div key={date}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                  <span style={{ fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, fontSize: '0.78rem', color: 'var(--text2)' }}>{formatDate(date)}</span>
                  <div style={{ flex: 1, height: '2px', background: 'var(--border)', borderRadius: '2px' }} />
                  {dayIncome > 0 && <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '0.85rem', color: 'var(--green)' }}>+{fmt(dayIncome)}</span>}
                  {dayExpense > 0 && <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '0.85rem', color: 'var(--red)' }}>-{fmt(dayExpense)}</span>}
                </div>

                {/* Transactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {txList.map(tx => {
                    const cat = getCat(tx.catId)
                    const isIncome = tx.amount > 0
                    return (
                      <div
                        key={tx.id}
                        style={{
                          background: 'var(--bg2)', borderRadius: '14px', padding: '12px 14px',
                          border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          opacity: deleting === tx.id ? 0.4 : 1, transition: 'opacity 0.2s',
                        }}
                      >
                        {/* Category icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                          background: cat.color + '22', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          {(() => { const Icon = CAT_ICONS[cat.id] ?? Tag; return <Icon size={17} color={cat.color} strokeWidth={2} /> })()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.name}
                          </p>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              background: cat.color + '18', color: cat.color,
                              padding: '1px 8px', borderRadius: '20px',
                              fontSize: '0.67rem', fontWeight: 700,
                              fontFamily: "'Kalam', 'Itim', cursive",
                            }}>
                              {cat.label}
                            </span>
                            {tx.note && <span style={{ fontSize: '0.68rem', color: 'var(--text2)', fontFamily: "'Kalam', 'Itim', cursive" }}>{tx.note}</span>}
                            {tx.source === 'ocr' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', color: 'var(--accent)', background: 'var(--accent-fill)', padding: '1px 6px', borderRadius: '4px', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700 }}>
                                <Camera size={9} strokeWidth={2} />OCR
                              </span>
                            )}
                            {tx.source === 'recurring' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', color: 'var(--purple)', background: 'var(--purple-fill)', padding: '1px 6px', borderRadius: '4px', fontFamily: "'Kalam', 'Itim', cursive", fontWeight: 700 }}>
                                <RotateCcw size={9} strokeWidth={2} />ประจำ
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.1rem',
                          color: isIncome ? 'var(--green)' : 'var(--red)',
                        }}>
                          {isIncome ? '+' : '-'}฿{fmt(tx.amount)}
                        </span>
                        <ConfirmButton
                          onConfirm={() => handleDelete(tx.id)}
                          disabled={deleting === tx.id}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
