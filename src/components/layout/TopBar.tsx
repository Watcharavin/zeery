interface TopBarProps {
  period: 'weekly' | 'monthly'
  onPeriodChange: (p: 'weekly' | 'monthly') => void
}

export default function TopBar({ period, onPeriodChange }: TopBarProps) {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <header
      style={{
        background: 'var(--bg2)',
        borderBottom: '3px solid var(--border)',
        padding: '0 1rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 3px 0 var(--border)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

      {/* Period toggle */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg3)',
          border: '2px solid var(--border)',
          borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
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
              borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
              border: period === p ? '2px solid var(--border)' : '2px solid transparent',
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
    </header>
  )
}
