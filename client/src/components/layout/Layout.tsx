import { NavLink, Outlet } from 'react-router'
import { cn } from '../../lib/cn'

// Add an entry here whenever a new page ships.
const navItems = [{ to: '/', label: 'Home', end: true }]

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <span className="font-semibold text-brand">FamHub</span>
          <nav aria-label="Main" className="flex gap-1">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm',
                    isActive ? 'bg-brand/10 font-medium text-brand' : 'text-muted hover:text-ink',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}