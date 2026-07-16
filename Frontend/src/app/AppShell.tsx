import { Outlet } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'

export function AppShell() {
  return (
    <div className="grid min-h-screen bg-frost lg:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-w-0">
        <Header />
        <main className="mx-auto max-w-[1440px] px-5 py-6 md:px-8 xl:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
