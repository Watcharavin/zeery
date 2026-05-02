import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface TopBarProps {
  period: 'weekly' | 'monthly'
  onPeriodChange: (p: 'weekly' | 'monthly') => void
  onMenuToggle: () => void
}

export default function TopBar({ period, onPeriodChange, onMenuToggle }: TopBarProps) {
  const { user, signOut } = useAuth()
  const now = new Date()
  const monthLabel = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <header
      style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 210,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            marginRight: '4px',
          }}
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        {/* Logo */}
        <span style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 700,
          fontSize: '1.5rem',
          color: 'var(--accent)',
          lineHeight: 1,
        }}>
          Zeery ✏️
        </span>
        <span style={{
          color: 'var(--text2)',
          fontSize: '0.82rem',
          fontFamily: "'Kalam', 'Itim', cursive",
        }}>
          {monthLabel}
        </span>
      </div>

      {/* User avatar + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

      {/* Period toggle */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '3px',
          gap: '2px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {(['weekly', 'monthly'] as const).map(p => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            style={{
              padding: '4px 14px',
              borderRadius: '10px',
              border: period === p ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: "'Kalam', 'Itim', cursive",
              background: period === p ? 'var(--bg2)' : 'transparent',
              color: period === p ? 'var(--text)' : 'var(--text2)',
              boxShadow: period === p ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {p === 'weekly' ? 'สัปดาห์' : 'เดือน'}
          </button>
        ))}
      </div>

        {/* Avatar */}
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)' }} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-fill)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Caveat', cursive", fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>
              {user?.displayName?.[0] ?? '?'}
            </div>
        }

        {/* Sign out */}
        <button onClick={signOut} title="ออกจากระบบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
