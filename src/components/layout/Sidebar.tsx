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
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '0.88rem',
  fontWeight: active ? 600 : 400,
  color: active ? 'var(--accent)' : 'var(--text2)',
  background: active ? 'rgba(232,93,36,0.08)' : 'transparent',
  transition: 'all 0.15s',
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
        borderRight: '1px solid var(--border)',
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
        <p style={{ fontSize: '0.7rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 6px' }}>
          หลัก
        </p>
        {navMain.map(n => <SideNavLink key={n.to} {...n} />)}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 6px' }}>
          อื่นๆ
        </p>
        {navOther.map(n => <SideNavLink key={n.to} {...n} />)}
      </div>
    </aside>
  )
}
