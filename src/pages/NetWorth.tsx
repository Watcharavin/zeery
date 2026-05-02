import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNetWorth } from '../hooks/useNetWorth'
import {
  addAsset, updateAsset, deleteAsset,
  addLiability, updateLiability, deleteLiability,
} from '../lib/firestore'
import type { Asset, Liability } from '../types'
import ConfirmButton from '../components/ui/ConfirmButton'
import { useToast } from '../components/ui/Toast'

function fmt(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

const ASSET_TYPES: { id: Asset['type']; label: string; emoji: string }[] = [
  { id: 'cash',       label: 'เงินสด / บัญชี', emoji: '💵' },
  { id: 'investment', label: 'การลงทุน',        emoji: '📈' },
  { id: 'property',  label: 'อสังหาริมทรัพย์',  emoji: '🏠' },
  { id: 'other',     label: 'อื่นๆ',             emoji: '📦' },
]

const LIABILITY_TYPES: { id: Liability['type']; label: string; emoji: string }[] = [
  { id: 'credit', label: 'บัตรเครดิต', emoji: '💳' },
  { id: 'loan',   label: 'สินเชื่อ',   emoji: '🏦' },
  { id: 'other',  label: 'อื่นๆ',      emoji: '📋' },
]

type EditItem = { kind: 'asset' | 'liability'; id?: string; label: string; type: string; value: string }

const EMPTY_ASSET: EditItem = { kind: 'asset', label: '', type: 'cash', value: '' }
const EMPTY_LIABILITY: EditItem = { kind: 'liability', label: '', type: 'credit', value: '' }

export default function NetWorth() {
  const { uid } = useAuth()
  const { assets, liabilities, totalAssets, totalLiabilities, netWorth, loading } = useNetWorth()
  const { toast } = useToast()

  const [form, setForm] = useState<EditItem | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!uid || !form) return
    const val = parseFloat(form.value)
    if (!form.label.trim() || isNaN(val) || val < 0) return
    setSaving(true)
    try {
      if (form.kind === 'asset') {
        if (form.id) {
          await updateAsset(uid, form.id, { label: form.label.trim(), type: form.type as Asset['type'], value: val })
        } else {
          await addAsset(uid, { label: form.label.trim(), type: form.type as Asset['type'], value: val })
        }
      } else {
        if (form.id) {
          await updateLiability(uid, form.id, { label: form.label.trim(), type: form.type as Liability['type'], value: val })
        } else {
          await addLiability(uid, { label: form.label.trim(), type: form.type as Liability['type'], value: val })
        }
      }
      setForm(null)
      toast('บันทึกแล้ว')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!uid) return
    await deleteAsset(uid, id)
    toast('ลบทรัพย์สินแล้ว')
  }

  const handleDeleteLiability = async (id: string) => {
    if (!uid) return
    await deleteLiability(uid, id)
    toast('ลบหนี้สินแล้ว')
  }

  const positiveNet = netWorth >= 0

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 80px' }}>
      <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Net Worth</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '20px' }}>ทรัพย์สินและหนี้สินรวม</p>

      {/* Summary card */}
      <div style={{
        background: 'var(--bg2)', borderRadius: '16px', padding: '20px',
        marginBottom: '24px', border: '1px solid var(--border)',
        display: 'flex', gap: '0', flexDirection: 'column',
      }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Net Worth</p>
        <p style={{
          fontFamily: 'DM Mono, monospace', fontSize: '2rem', fontWeight: 700,
          color: positiveNet ? 'var(--green)' : 'var(--red)', marginBottom: '16px',
        }}>
          {positiveNet ? '' : '-'}฿{fmt(Math.abs(netWorth))}
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '2px' }}>ทรัพย์สิน</p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--green)' }}>
              ฿{fmt(totalAssets)}
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '2px' }}>หนี้สิน</p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--red)' }}>
              ฿{fmt(totalLiabilities)}
            </p>
          </div>
          {totalAssets > 0 && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '2px' }}>D/A ratio</p>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                {(totalLiabilities / totalAssets * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Net worth bar */}
        {(totalAssets > 0 || totalLiabilities > 0) && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden', display: 'flex' }}>
              {totalAssets > 0 && (
                <div style={{
                  width: `${Math.min(100, (totalAssets / (totalAssets + totalLiabilities)) * 100)}%`,
                  background: 'var(--green)', borderRadius: '99px 0 0 99px',
                }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--green)' }}>ทรัพย์สิน</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--red)' }}>หนี้สิน</span>
            </div>
          </div>
        )}
      </div>

      {/* Assets section */}
      <Section
        title="ทรัพย์สิน"
        accent="var(--green)"
        onAdd={() => setForm({ ...EMPTY_ASSET })}
      >
        {assets.length === 0 ? (
          <EmptyRow label="ยังไม่มีทรัพย์สิน" />
        ) : (
          assets.map(a => {
            const t = ASSET_TYPES.find(x => x.id === a.type)
            return (
              <ItemRow
                key={a.id}
                emoji={t?.emoji ?? '📦'}
                label={a.label}
                sub={t?.label ?? a.type}
                value={a.value}
                onEdit={() => setForm({ kind: 'asset', id: a.id, label: a.label, type: a.type, value: String(a.value) })}
                onDelete={() => handleDeleteAsset(a.id)}
              />
            )
          })
        )}
      </Section>

      <div style={{ marginBottom: '16px' }} />

      {/* Liabilities section */}
      <Section
        title="หนี้สิน"
        accent="var(--red)"
        onAdd={() => setForm({ ...EMPTY_LIABILITY })}
      >
        {liabilities.length === 0 ? (
          <EmptyRow label="ยังไม่มีหนี้สิน" />
        ) : (
          liabilities.map(l => {
            const t = LIABILITY_TYPES.find(x => x.id === l.type)
            return (
              <ItemRow
                key={l.id}
                emoji={t?.emoji ?? '📋'}
                label={l.label}
                sub={t?.label ?? l.type}
                value={l.value}
                valueColor="var(--red)"
                onEdit={() => setForm({ kind: 'liability', id: l.id, label: l.label, type: l.type, value: String(l.value) })}
                onDelete={() => handleDeleteLiability(l.id)}
              />
            )
          })
        )}
      </Section>

      {/* Modal */}
      {form && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={e => { if (e.target === e.currentTarget) setForm(null) }}
        >
          <div style={{
            background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', width: '100%', maxWidth: '520px',
          }}>
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', marginBottom: '20px' }}>
              {form.id ? 'แก้ไข' : 'เพิ่ม'}{form.kind === 'asset' ? 'ทรัพย์สิน' : 'หนี้สิน'}
            </p>

            {/* Type selector */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '8px' }}>ประเภท</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {(form.kind === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => f ? { ...f, type: t.id } : f)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${form.type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.type === t.id ? 'var(--accent)' : 'var(--bg3)',
                    color: form.type === t.id ? '#fff' : 'var(--text2)',
                    fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Label input */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '6px' }}>ชื่อ</p>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(f => f ? { ...f, label: e.target.value } : f)}
              placeholder="เช่น บัญชีกสิกร, คอนโด"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem',
                outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
              }}
            />

            {/* Value input */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '6px' }}>มูลค่า (บาท)</p>
            <input
              type="number"
              value={form.value}
              onChange={e => setForm(f => f ? { ...f, value: e.target.value } : f)}
              placeholder="0"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontFamily: 'DM Mono, monospace', fontSize: '1.1rem',
                outline: 'none', boxSizing: 'border-box', marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'var(--accent)', color: '#fff', fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={() => setForm(null)}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text2)', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem', cursor: 'pointer',
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

// ── sub-components ────────────────────────────────────────────────────────────

function Section({
  title, accent, onAdd, children,
}: {
  title: string; accent: string; onAdd: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ width: '3px', height: '16px', background: accent, borderRadius: '2px', marginRight: '8px' }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', flex: 1 }}>{title}</span>
        <button
          onClick={onAdd}
          style={{
            padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer',
            fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif',
          }}
        >
          + เพิ่ม
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  )
}

function ItemRow({
  emoji, label, sub, value, valueColor = 'var(--green)', onEdit, onDelete,
}: {
  emoji: string; label: string; sub: string; value: number
  valueColor?: string; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div style={{
      background: 'var(--bg2)', borderRadius: '12px', padding: '12px 14px',
      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>{sub}</p>
      </div>
      <p style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: '0.95rem', color: valueColor, marginRight: '8px' }}>
        ฿{value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
      </p>
      <button
        onClick={onEdit}
        style={{
          padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
          background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.72rem',
        }}
      >แก้</button>
      <ConfirmButton onConfirm={onDelete} size={11} />
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div style={{
      background: 'var(--bg2)', borderRadius: '12px', padding: '16px',
      border: '1px dashed var(--border)', textAlign: 'center',
    }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{label}</p>
    </div>
  )
}
