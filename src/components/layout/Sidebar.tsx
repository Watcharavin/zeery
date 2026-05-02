import { NavLink } from 'react-router-dom'

const navMain = [
  { to: '/',             label: 'Overview',   icon: '◉' },
  { to: '/transactions', label: 'รายการ',     icon: '☰' },
  { to: '/budget',       label: 'Budget',     icon: '◎' },
  { to: '/ai',           label: 'AI Chat',    icon: '✦' },
  { to: '/add',          label: 'เพิ่มรายการ', icon: '+' },
]

const navOther = [
  { to: '/savings',    label: 'ออมเงิน',     icon: '🏦' },
  { to: '/networth',   label: 'Net Worth',   icon: '📊' },
  { to: '/recurring',  label: 'รายการประจำ', icon: '🔄' },
  { to: '/report',     label: 'รายงาน',      icon: '📈' },
  { to: '/export',     label: 'Export',      icon: '⬇' },
  { to: '/categories', label: 'Categories',  icon: '🏷️' },
]

const linkStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
  textDecoration: 'none',
  fontSize: '0.88rem',
  fontWeight: active ? 700 : 400,
  fontFamily: "'Kalam', 'Itim', cursive",
  color: active ? 'var(--accent)' : 'var(--text2)',
  background: active ? 'var(--accent-fill)' : 'transparent',
  border: active ? '2px solid var(--accent)' : '2px solid transparent',
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
  transition: 'all 0.15s ease',
})

function SideNavLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => linkStyle(isActive)}>
      <span style={{ width: '20px', textAlign: 'center', fontSize: '1rem' }}>{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside
      style={{
        width: '200px',
        flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '3px solid var(--border)',
        boxShadow: '3px 0 0 var(--border)',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        position: 'sticky',
        top: '56px',
        height: 'calc(100svh - 56px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        <p style={{
          fontSize: '0.68rem',
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '0 12px 6px',
          fontFamily: "'Caveat', cursive",
          fontWeight: 700,
          fontSize: '0.8rem',
        }}>
          หลัก
        </p>
        {navMain.map(n => <SideNavLink key={n.to} {...n} />)}
      </div>

      <div style={{ borderTop: '2px dashed var(--text2)', paddingTop: '0.75rem', opacity: 0.6 }}>
        <p style={{
          fontFamily: "'Caveat', cursive",
          fontWeight: 700,
          fontSize: '0.8rem',
          color: 'var(--text2)',
          padding: '0 12px 6px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          อื่นๆ
        </p>
      </div>
      <div style={{ opacity: 1 }}>
        {navOther.map(n => <SideNavLink key={n.to} {...n} />)}
      </div>
    </aside>
  )
}
