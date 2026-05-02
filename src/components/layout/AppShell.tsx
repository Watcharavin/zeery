import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useState, useEffect } from 'react'

export default function AppShell() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <TopBar
        period={period}
        onPeriodChange={setPeriod}
        onMenuToggle={() => setDrawerOpen(v => !v)}
      />

      <div style={{ display: 'flex' }}>
        {/* Sidebar — desktop always visible */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div
            className="md:hidden"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              display: 'flex',
            }}
          >
            {/* Backdrop */}
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
            />
            {/* Drawer panel */}
            <div style={{
              position: 'relative',
              width: '220px',
              background: 'var(--bg2)',
              borderRight: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              height: 'calc(100svh - 56px)',
              overflowY: 'auto',
              marginTop: '56px',
            }}>
              <Sidebar drawer />
            </div>
          </div>
        )}

        {/* Main content */}
        <main
          className="pb-20 md:pb-10"
          style={{ flex: 1, minWidth: 0 }}
        >
          <Outlet context={{ period }} />
        </main>
      </div>

      {/* BottomNav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
