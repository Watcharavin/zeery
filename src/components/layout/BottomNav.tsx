import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, List, PieChart, Sparkles, Plus, type LucideIcon } from 'lucide-react'

const tabs: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/',             label: 'หลัก',   Icon: LayoutDashboard },
  { to: '/transactions', label: 'รายการ', Icon: List },
  { to: '/budget',       label: 'Budget', Icon: PieChart },
  { to: '/ai',           label: 'AI',     Icon: Sparkles },
]

export default function BottomNav() {
  const navigate = useNavigate()

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--text2)',
    fontSize: '0.65rem',
    fontWeight: active ? 700 : 400,
    fontFamily: "'Kalam', 'Itim', cursive",
    padding: '8px 0',
    borderBottom: active ? '3px solid var(--accent)' : '3px solid transparent',
    transition: 'all 0.15s ease',
  })

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.slice(0, 2).map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} style={({ isActive }) => tabStyle(isActive)}>
          <t.Icon size={20} strokeWidth={2.5} />
          {t.label}
        </NavLink>
      ))}

      {/* FAB — doodle style */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/add')}
          style={{
            width: '50px',
            height: '50px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(45,155,135,0.4)',
            color: '#fff',
            marginBottom: '10px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,155,135,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(45,155,135,0.4)'
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'scale(0.95)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(45,155,135,0.3)'
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(45,155,135,0.4)'
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {tabs.slice(2).map(t => (
        <NavLink key={t.to} to={t.to} style={({ isActive }) => tabStyle(isActive)}>
          <t.Icon size={20} strokeWidth={2.5} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
