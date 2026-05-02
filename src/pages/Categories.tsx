import { useState } from 'react'
import { useCategories } from '../contexts/CategoriesContext'
import { Tag, Trash2, Plus, Lock } from 'lucide-react'
import { CAT_ICONS } from '../lib/catIcons'

const PRESET_COLORS = [
  '#f59e0b', '#f97316', '#e85d24', '#ef4444',
  '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4',
  '#10b981', '#84cc16', '#a78bfa', '#6b7280',
]

const PRESET_EMOJIS = [
  '🛍️','🎮','✈️','📚','🎓','💄','🐾','🧴',
  '🏋️','☕','🎁','🍺','💻','🎵','🚿','🎭',
  '🐶','🌿','🏖️','🎨','🎯','🔧','🚴','🍕',
]

export default function Categories() {
  const { categories, addCategory, deleteCategory } = useCategories()

  const [label, setLabel] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [emoji, setEmoji] = useState(PRESET_EMOJIS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const customCats = categories.filter(c => c.custom)
  const builtInCats = categories.filter(c => !c.custom)

  const card: React.CSSProperties = {
    background: 'var(--bg2)',
    borderRadius: 16,
    padding: '20px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
    marginBottom: 16,
  }

  async function handleAdd() {
    const trimmed = label.trim()
    if (!trimmed) { setError('กรุณาใส่ชื่อ category'); return }
    if (categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())) {
      setError('มี category นี้อยู่แล้ว'); return
    }
    setSaving(true)
    setError('')
    try {
      await addCategory({ label: trimmed, color, emoji })
      setLabel('')
      setColor(PRESET_COLORS[0])
      setEmoji(PRESET_EMOJIS[0])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: "'Caveat', cursive",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '2px',
      }}>
        Categories 🏷️
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 20, fontFamily: "'Kalam', 'Itim', cursive" }}>
        เพิ่ม category ของตัวเองได้ไม่จำกัด
      </p>

      {/* Add form */}
      <div style={card}>
        <p style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 700, fontSize: '1.1rem',
          color: 'var(--text)', marginBottom: 14,
        }}>
          เพิ่ม Category ใหม่
        </p>

        {/* Name */}
        <label style={{ fontSize: '0.78rem', color: 'var(--text2)', display: 'block', marginBottom: 6, fontFamily: "'Kalam', 'Itim', cursive" }}>
          ชื่อ
        </label>
        <input
          value={label}
          onChange={e => { setLabel(e.target.value); setError('') }}
          placeholder="เช่น สัตว์เลี้ยง, เที่ยว, เสื้อผ้า"
          maxLength={20}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px',
            fontSize: '0.95rem', color: 'var(--text)',
            fontFamily: "'Kalam', 'Itim', cursive", outline: 'none',
            marginBottom: 14,
          }}
        />

        {/* Emoji picker */}
        <label style={{ fontSize: '0.78rem', color: 'var(--text2)', display: 'block', marginBottom: 8, fontFamily: "'Kalam', 'Itim', cursive" }}>
          ไอคอน (emoji)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {PRESET_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                width: 36, height: 36,
                borderRadius: 8,
                border: emoji === e ? `2px solid ${color}` : '1px solid var(--border)',
                background: emoji === e ? `${color}20` : 'var(--bg3)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: emoji === e ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <label style={{ fontSize: '0.78rem', color: 'var(--text2)', display: 'block', marginBottom: 8, fontFamily: "'Kalam', 'Itim', cursive" }}>
          สี
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                cursor: 'pointer',
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: `${color}18`,
          border: `2px solid ${color}40`,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
          <span style={{ fontWeight: 700, color, fontSize: '0.95rem', fontFamily: "'Kalam', 'Itim', cursive" }}>
            {label || 'ชื่อ category'}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.72rem',
            background: `${color}30`, color,
            padding: '2px 8px', borderRadius: 20,
            fontFamily: "'Kalam', 'Itim', cursive",
          }}>
            ตัวอย่าง
          </span>
        </div>

        {error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginBottom: 10, fontFamily: "'Kalam', 'Itim', cursive" }}>{error}</p>
        )}

        <button
          onClick={handleAdd}
          disabled={saving || !label.trim()}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: '10px',
            border: label.trim() ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: label.trim() ? 'var(--accent)' : 'var(--bg3)',
            color: label.trim() ? '#fff' : 'var(--text2)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: label.trim() ? 'pointer' : 'default',
            fontFamily: "'Kalam', 'Itim', cursive",
            boxShadow: label.trim() ? 'var(--shadow)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Plus size={16} />
          {saving ? 'กำลังบันทึก...' : 'เพิ่ม Category'}
        </button>
      </div>

      {/* Custom categories */}
      {customCats.length > 0 && (
        <div style={card}>
          <p style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700, fontSize: '1.1rem',
            color: 'var(--text)', marginBottom: 12,
          }}>
            Categories ของคุณ ({customCats.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customCats.map(cat => {
              const Icon = CAT_ICONS[cat.id] ?? Tag
              return (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>{cat.emoji}</span>
                  <Icon size={14} color={cat.color} />
                  <span style={{
                    fontWeight: 700, fontSize: '0.9rem',
                    color: 'var(--text)', flex: 1,
                    fontFamily: "'Kalam', 'Itim', cursive",
                  }}>
                    {cat.label}
                  </span>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: cat.color, flexShrink: 0,
                  }} />
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text2)',
                      padding: '4px', borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Built-in (read-only) */}
      <div style={card}>
        <p style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 700, fontSize: '1.1rem',
          color: 'var(--text)',
          marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Lock size={13} color="var(--text2)" />
          Categories เริ่มต้น
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 12, fontFamily: "'Kalam', 'Itim', cursive" }}>
          categories เหล่านี้เป็นค่าเริ่มต้นของระบบ แก้ไขไม่ได้
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {builtInCats.map(cat => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 20,
              background: `${cat.color}18`,
              border: `2px solid ${cat.color}40`,
            }}>
              <span style={{ fontSize: '0.85rem' }}>{cat.emoji}</span>
              <span style={{ fontSize: '0.8rem', color: cat.color, fontWeight: 700, fontFamily: "'Kalam', 'Itim', cursive" }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
