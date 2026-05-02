import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useState } from 'react'

export default function AppShell() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly')
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <TopBar period={period} onPeriodChange={setPeriod} />

      <div style={{ display: 'flex' }}>
        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            paddingBottom: '72px', // espace for BottomNav on mobile
          }}
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
