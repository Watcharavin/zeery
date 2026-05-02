import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../hooks/useAuth'
import { subscribeTransactions } from '../lib/firestore'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Transaction, Category } from '../types'
import { useCategories } from '../contexts/CategoriesContext'
import { Eye, Download, Printer, X, FileText, Database, BarChart3 } from 'lucide-react'

function fmt(n: number) {
  return Math.abs(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function thaiMonthLabel(ym: string) {
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
}

function userCol(uid: string, sub: string) {
  return collection(db, 'users', uid, sub)
}

// ── CSV export ────────────────────────────────────────────────────────────────

function txToCSV(txs: Transaction[], categories: Category[]): string {
  const header = 'date,name,category,amount,note'
  const rows = txs.map(tx => {
    const cat = categories.find(c => c.id === tx.catId)?.label ?? tx.catId
    const note = (tx.note ?? '').replace(/,/g, ' ').replace(/\n/g, ' ')
    const name = tx.name.replace(/,/g, ' ')
    return `${tx.date},${name},${cat},${tx.amount},${note}`
  })
  return [header, ...rows].join('\n')
}

function downloadText(text: string, filename: string, mime = 'text/csv') {
  const blob = new Blob(['\uFEFF' + text], { type: mime + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── helpers ───────────────────────────────────────────────────────────────────

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return `${y}/${mo}`
}

const MONTHS_BACK = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - i)
  return d.toISOString().slice(0, 7)
})

type CatRow = { id: string; label: string; emoji: string; amount: number; pct: number }

type PreviewData =
  | { kind: 'csv'; rows: Transaction[]; total: number }
  | { kind: 'json'; text: string }
  | { kind: 'pdf'; month: string; income: number; expense: number; savings: number; net: number; cats: CatRow[]; txCount: number; txs: Transaction[] }

type PDFData = Extract<PreviewData, { kind: 'pdf' }>

function computePDFData(allTxs: Transaction[], forMonth: string, categories: Category[]): PDFData {
  const from = forMonth + '-01'
  const to = forMonth + '-31'
  const txs = allTxs.filter(tx => tx.date >= from && tx.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
  const income = txs.filter(t => t.amount > 0 && t.catId !== 'savings').reduce((s, t) => s + t.amount, 0)
  const savings = txs.filter(t => t.catId === 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
  const expense = txs.filter(t => t.amount < 0 && t.catId !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
  const net = income - expense - savings
  const catMap: Record<string, number> = {}
  txs.filter(t => t.amount < 0 && t.catId !== 'savings').forEach(t => {
    catMap[t.catId] = (catMap[t.catId] || 0) + Math.abs(t.amount)
  })
  const cats: CatRow[] = Object.entries(catMap)
    .map(([id, amount]) => {
      const c = categories.find(x => x.id === id)
      return { id, label: c?.label ?? id, emoji: c?.emoji ?? '📌', amount, pct: expense > 0 ? amount / expense : 0 }
    })
    .sort((a, b) => b.amount - a.amount)
  return { kind: 'pdf', month: forMonth, income, expense, savings, net, cats, txCount: txs.length, txs }
}

export default function Export() {
  const { uid } = useAuth()
  const { categories } = useCategories()
  const [fromMonth, setFromMonth] = useState(MONTHS_BACK[1])
  const [toMonth, setToMonth] = useState(MONTHS_BACK[0])
  const [pdfMonth, setPdfMonth] = useState(MONTHS_BACK[0])
  const [csvLoading, setCsvLoading] = useState(false)
  const [jsonLoading, setJsonLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  // Separate state for the print area — loaded on demand, triggers window.print()
  const [printData, setPrintData] = useState<PDFData | null>(null)
  const [shouldPrint, setShouldPrint] = useState(false)

  // Fire window.print() after printData has rendered into the DOM
  useEffect(() => {
    if (shouldPrint && printData) {
      setShouldPrint(false)
      window.print()
    }
  }, [shouldPrint, printData])

  // Fetch filtered transactions (shared by preview + download)
  const fetchCSVTxs = (): Promise<Transaction[]> => {
    return new Promise(resolve => {
      if (!uid) { resolve([]); return }
      const from = fromMonth + '-01'
      const to = toMonth + '-31'
      const unsub = subscribeTransactions(uid, txs => {
        unsub()
        resolve(
          txs
            .filter(tx => tx.date >= from && tx.date <= to)
            .sort((a, b) => a.date.localeCompare(b.date))
        )
      })
    })
  }

  const handleCSVPreview = async () => {
    if (!uid) return
    setCsvLoading(true)
    try {
      const txs = await fetchCSVTxs()
      setPreview({ kind: 'csv', rows: txs, total: txs.length })
    } finally {
      setCsvLoading(false)
    }
  }

  const handleCSV = async () => {
    if (!uid) return
    setCsvLoading(true)
    try {
      const txs = await fetchCSVTxs()
      downloadText(txToCSV(txs, categories), `zeery-transactions-${fromMonth}-${toMonth}.csv`)
    } finally {
      setCsvLoading(false)
    }
  }

  const loadPDFData = (): Promise<PDFData> => {
    return new Promise((resolve, reject) => {
      if (!uid) { reject(new Error('no uid')); return }
      const unsub = subscribeTransactions(uid, allTxs => {
        unsub()
        resolve(computePDFData(allTxs, pdfMonth, categories))
      })
    })
  }

  const handlePDFPreview = async () => {
    if (!uid) return
    setPdfLoading(true)
    try {
      const data = await loadPDFData()
      setPreview(data)
    } finally {
      setPdfLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!uid) return
    setPdfLoading(true)
    try {
      const data = await loadPDFData()
      setPrintData(data)
      setShouldPrint(true)
    } finally {
      setPdfLoading(false)
    }
  }

  const fetchJSONDump = async () => {
    if (!uid) return null
    const [txSnap, budgetSnap, goalSnap, assetSnap, liabSnap, recurSnap] = await Promise.all([
      getDocs(userCol(uid, 'transactions')),
      getDocs(userCol(uid, 'budgets')),
      getDocs(userCol(uid, 'goals')),
      getDocs(userCol(uid, 'assets')),
      getDocs(userCol(uid, 'liabilities')),
      getDocs(userCol(uid, 'recurring')),
    ])
    return {
      exportedAt: new Date().toISOString(),
      transactions: txSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      budgets: budgetSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      goals: goalSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      assets: assetSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      liabilities: liabSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      recurring: recurSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    }
  }

  const handleJSONPreview = async () => {
    if (!uid) return
    setJsonLoading(true)
    try {
      const dump = await fetchJSONDump()
      if (dump) setPreview({ kind: 'json', text: JSON.stringify(dump, null, 2) })
    } finally {
      setJsonLoading(false)
    }
  }

  const handleJSON = async () => {
    if (!uid) return
    setJsonLoading(true)
    try {
      const dump = await fetchJSONDump()
      if (dump) downloadText(JSON.stringify(dump, null, 2), `zeery-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
    } finally {
      setJsonLoading(false)
    }
  }

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        #print-area { display: none; }
        @page { margin: 10mm; size: A4; }
        @media print {
          body > * { display: none !important; }
          body > #print-area { display: block !important; }
        }
      `}</style>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 80px' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Export</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '24px' }}>ดาวน์โหลดข้อมูลของคุณ</p>

        {/* CSV */}
        <ExportCard
          icon={<FileText size={22} />}
          title="CSV"
          description="รายการธุรกรรมพร้อมกรองช่วงเวลา"
          columns="date, name, category, amount, note"
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>จาก</label>
              <select
                value={fromMonth}
                onChange={e => setFromMonth(e.target.value)}
                style={selectStyle}
              >
                {MONTHS_BACK.map(m => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>ถึง</label>
              <select
                value={toMonth}
                onChange={e => setToMonth(e.target.value)}
                style={selectStyle}
              >
                {MONTHS_BACK.map(m => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCSVPreview}
              disabled={csvLoading}
              style={{ ...ghostBtn, flex: 1 }}
            >
              <Eye size={14} strokeWidth={2} /> ดูตัวอย่าง
            </button>
            <ActionButton onClick={handleCSV} loading={csvLoading} color="var(--green)">
              <Download size={14} strokeWidth={2} /> ดาวน์โหลด
            </ActionButton>
          </div>
        </ExportCard>

        {/* PDF */}
        <ExportCard
          icon={<BarChart3 size={22} />}
          title="PDF"
          description="สรุปรายเดือน — พิมพ์หรือบันทึกเป็น PDF"
          columns="รายรับ, รายจ่าย, ออม, รายจ่ายแยกหมวด, รายการทั้งหมด"
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>เดือน</label>
            <select value={pdfMonth} onChange={e => setPdfMonth(e.target.value)} style={selectStyle}>
              {MONTHS_BACK.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePDFPreview} disabled={pdfLoading} style={{ ...ghostBtn, flex: 1 }}>
              {pdfLoading ? 'กำลังโหลด...' : <><Eye size={14} strokeWidth={2} /> ดูตัวอย่าง</>}
            </button>
            <ActionButton onClick={handlePrint} color="var(--accent)">
              <Printer size={14} strokeWidth={2} /> พิมพ์
            </ActionButton>
          </div>
        </ExportCard>

        {/* JSON */}
        <ExportCard
          icon={<Database size={22} />}
          title="JSON Backup"
          description="ข้อมูลทั้งหมดจาก Firestore"
          columns="transactions + budgets + goals + assets + liabilities + recurring"
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleJSONPreview}
              disabled={jsonLoading}
              style={{ ...ghostBtn, flex: 1 }}
            >
              <Eye size={14} strokeWidth={2} /> ดูตัวอย่าง
            </button>
            <ActionButton onClick={handleJSON} loading={jsonLoading} color="var(--purple)">
              <Download size={14} strokeWidth={2} /> ดาวน์โหลด
            </ActionButton>
          </div>
        </ExportCard>
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300,
          }}
          onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <div style={{
            background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: '600px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', padding: '16px 20px',
              borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', flex: 1 }}>
                {preview.kind === 'csv'
                  ? `ตัวอย่าง CSV — ${preview.total} รายการ`
                  : preview.kind === 'json'
                  ? 'ตัวอย่าง JSON Backup'
                  : `รายงานสรุป — ${thaiMonthLabel(preview.month)}`}
              </span>
              <button
                onClick={() => setPreview(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: '4px', display: 'flex' }}
              ><X size={18} /></button>
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
              {preview.kind === 'csv' && (
                preview.rows.length === 0 ? (
                  <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text2)', fontSize: '0.85rem' }}>
                    ไม่มีรายการในช่วงนี้
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
                        {['วันที่', 'ชื่อ', 'หมวด', 'จำนวน', 'โน้ต'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((tx, i) => {
                        const cat = categories.find(c => c.id === tx.catId)
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg3)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text2)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{tx.date}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{cat?.emoji} {cat?.label}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 600, color: tx.amount > 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('th-TH')}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text2)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note ?? ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {preview.kind === 'json' && (
                <pre style={{
                  margin: 0, padding: '16px 20px',
                  fontFamily: 'DM Mono, monospace', fontSize: '0.72rem',
                  color: 'var(--text)', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {preview.text.slice(0, 8000)}{preview.text.length > 8000 ? '\n\n... (ตัดสั้นเพื่อแสดงผล)' : ''}
                </pre>
              )}

              {preview.kind === 'pdf' && <PDFReport data={preview} categories={categories} />}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {preview.kind === 'pdf' ? (
                <button
                  onClick={handlePrint}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                    background: 'var(--accent)', color: '#fff', fontWeight: 600,
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}
                >
                  <Printer size={15} strokeWidth={2} /> พิมพ์ / บันทึก PDF
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (preview.kind === 'csv') handleCSV()
                    else handleJSON()
                    setPreview(null)
                  }}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                    background: preview.kind === 'csv' ? 'var(--green)' : 'var(--purple)',
                    color: '#fff', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.9rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}
                >
                  <Download size={14} strokeWidth={2} /> ดาวน์โหลด{preview.kind === 'csv' ? ' CSV' : ' JSON'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print area — rendered as portal directly into <body> so CSS body > #print-area works */}
      {createPortal(
        <div id="print-area">
          {printData && <PDFReport data={printData} categories={categories} print />}
        </div>,
        document.body
      )}
    </>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function ExportCard({
  icon, title, description, columns, children,
}: {
  icon: React.ReactNode; title: string; description: string; columns: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--bg2)', borderRadius: '14px', padding: '18px',
      border: '1px solid var(--border)', marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ color: 'var(--text2)' }}>{icon}</div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{title}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{description}</p>
        </div>
      </div>
      <p style={{ fontSize: '0.68rem', color: 'var(--text2)', fontFamily: 'DM Mono, monospace', marginBottom: '12px', background: 'var(--bg3)', padding: '6px 10px', borderRadius: '6px' }}>
        {columns}
      </p>
      {children}
    </div>
  )
}

function ActionButton({
  onClick, loading, color, children,
}: {
  onClick: () => void; loading?: boolean; color: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
        background: color, color: '#fff', fontWeight: 600,
        fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}
    >
      {loading ? 'กำลังโหลด...' : children}
    </button>
  )
}

function PDFReport({
  data,
  categories,
  print: isPrint = false,
}: {
  data: Extract<PreviewData, { kind: 'pdf' }>
  categories: Category[]
  print?: boolean
}) {
  const { month, income, expense, savings, net, cats, txs } = data
  const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  const monthLabel = thaiMonthLabel(month)

  // Always use hardcoded hex for print compat; CSS vars for in-app preview
  const c = isPrint
    ? { text: '#111827', text2: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', subtle: '#f3f4f6' }
    : { text: 'var(--text)', text2: 'var(--text2)', bg: 'var(--bg3)', border: 'var(--border)', subtle: 'var(--bg3)' }

  return (
    <div style={{ fontFamily: 'DM Sans, Noto Sans Thai, sans-serif', color: c.text, background: isPrint ? '#fff' : 'var(--bg2)' }}>

      {/* ── HEADER BAR ─────────────────────────────────────── */}
      <div style={{
        background: '#e85d24',
        padding: '22px 28px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Zeery · Personal Finance
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>
            สรุปรายเดือน
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '5px', fontWeight: 500 }}>
            {monthLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>ออกรายงานเมื่อ</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>{printDate}</p>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
            {txs.length} รายการ
          </p>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* ── SUMMARY CARDS ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'รายรับ',    value: income,   color: '#16a34a', bg: '#f0fdf4', sign: '+' },
            { label: 'รายจ่าย',  value: expense,  color: '#dc2626', bg: '#fef2f2', sign: '-' },
            { label: 'ออมทรัพย์', value: savings, color: '#7c3aed', bg: '#f5f3ff', sign: '' },
            { label: 'คงเหลือ',  value: net,      color: net >= 0 ? '#16a34a' : '#dc2626', bg: net >= 0 ? '#f0fdf4' : '#fef2f2', sign: net >= 0 ? '+' : '-' },
          ].map(s => (
            <div key={s.label} style={{
              background: isPrint ? s.bg : c.bg,
              borderRadius: '10px', padding: '12px 14px',
              borderLeft: `3px solid ${s.color}`,
            }}>
              <p style={{ fontSize: '0.65rem', color: c.text2, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {s.label}
              </p>
              <p style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: '1rem', color: s.color, lineHeight: 1 }}>
                {s.sign}฿{fmt(Math.abs(s.value))}
              </p>
            </div>
          ))}
        </div>

        {/* ── CATEGORY BREAKDOWN ─────────────────────────────── */}
        {cats.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{
              fontSize: '0.68rem', fontWeight: 700, color: c.text2,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '14px', paddingBottom: '8px',
              borderBottom: `2px solid ${isPrint ? '#e5e7eb' : c.border}`,
            }}>
              รายจ่ายแยกหมวดหมู่
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cats.map(cat => {
                const catColor = categories.find(c => c.id === cat.id)?.color ?? '#6b7280'
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.82rem', color: c.text, display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0, display: 'inline-block' }} />
                        {cat.emoji} {cat.label}
                      </span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', color: c.text2 }}>
                        ฿{fmt(cat.amount)} · {Math.round(cat.pct * 100)}%
                      </span>
                    </div>
                    <div style={{ height: '5px', background: c.subtle, borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.pct * 100}%`, background: catColor, borderRadius: '99px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TRANSACTION TABLE ───────────────────────────────── */}
        <div>
          <p style={{
            fontSize: '0.68rem', fontWeight: 700, color: c.text2,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: '14px', paddingBottom: '8px',
            borderBottom: `2px solid ${isPrint ? '#e5e7eb' : c.border}`,
          }}>
            รายการทั้งหมด ({txs.length} รายการ)
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: c.subtle }}>
                {['วันที่', 'ชื่อ', 'หมวด', 'จำนวน', 'โน้ต'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left', color: c.text2,
                    fontWeight: 600, whiteSpace: 'nowrap',
                    borderBottom: `2px solid ${isPrint ? '#e5e7eb' : c.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => {
                const cat = categories.find(c => c.id === tx.catId)
                const catColor = cat?.color ?? '#6b7280'
                return (
                  <tr key={tx.id} style={{
                    borderBottom: `1px solid ${isPrint ? '#f3f4f6' : c.border}`,
                    background: i % 2 !== 0 ? (isPrint ? '#f9fafb' : c.subtle) : 'transparent',
                  }}>
                    <td style={{ padding: '7px 10px', color: c.text2, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{tx.date}</td>
                    <td style={{ padding: '7px 10px', color: c.text, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: catColor + '1a', color: catColor,
                        padding: '2px 8px', borderRadius: '99px',
                        fontSize: '0.68rem', fontWeight: 600,
                      }}>
                        {cat?.emoji} {cat?.label}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: tx.amount > 0 ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                      {tx.amount > 0 ? '+' : '-'}฿{fmt(Math.abs(tx.amount))}
                    </td>
                    <td style={{ padding: '7px 10px', color: c.text2, fontSize: '0.7rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.note ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div style={{
          marginTop: '32px', paddingTop: '12px',
          borderTop: `1px solid ${isPrint ? '#e5e7eb' : c.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: '0.62rem', color: c.text2 }}>Zeery — Personal Finance Tracker</p>
          <p style={{ fontSize: '0.62rem', color: c.text2, fontFamily: 'DM Mono, monospace' }}>
            {monthLabel} · {txs.length} tx · net {net >= 0 ? '+' : ''}฿{fmt(Math.abs(net))}
          </p>
        </div>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg3)',
  color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
  outline: 'none', cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  padding: '10px', borderRadius: '10px', border: '1px solid var(--border)',
  background: 'var(--bg3)', color: 'var(--text2)', fontWeight: 600,
  fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
}
