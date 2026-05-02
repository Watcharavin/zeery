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
    gap: '3px',
    textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--text2)',
    fontSize: '0.65rem',
    fontWeight: active ? 600 : 400,
    padding: '8px 0',
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
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Tab 1 & 2 */}
      {tabs.slice(0, 2).map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} style={({ isActive }) => tabStyle(isActive)}>
          <t.Icon size={20} />
          {t.label}
        </NavLink>
      ))}

      {/* FAB center */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/add')}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232,93,36,0.4)',
            color: '#fff',
            marginBottom: '8px',
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Tab 3 & 4 */}
      {tabs.slice(2).map(t => (
        <NavLink key={t.to} to={t.to} style={({ isActive }) => tabStyle(isActive)}>
          <t.Icon size={20} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
