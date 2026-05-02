import { useTheme } from '../../contexts/ThemeContext'
import { Sun, Moon, SunMoon } from 'lucide-react'

interface TopBarProps {
  period: 'weekly' | 'monthly'
  onPeriodChange: (p: 'weekly' | 'monthly') => void
}

export default function TopBar({ period, onPeriodChange }: TopBarProps) {
  const { isDark, setTheme, theme } = useTheme()

  const now = new Date()
  const monthLabel = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  const toggleTheme = () => {
    if (theme === 'auto') setTheme('dark')
    else if (theme === 'dark') setTheme('light')
    else setTheme('auto')
  }

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
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          Zeery
        </span>
        <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{monthLabel}</span>
      </div>

      {/* Period toggle */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg3)',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px',
        }}
      >
        {(['weekly', 'monthly'] as const).map(p => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
              background: period === p ? 'var(--bg2)' : 'transparent',
              color: period === p ? 'var(--text)' : 'var(--text2)',
              boxShadow: period === p ? '0 1px 3px var(--border)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {p === 'weekly' ? 'สัปดาห์' : 'เดือน'}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Theme: ${theme}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '4px',
          borderRadius: '6px',
          color: 'var(--text2)',
        }}
      >
        {theme === 'auto' ? <SunMoon size={18} /> : isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
