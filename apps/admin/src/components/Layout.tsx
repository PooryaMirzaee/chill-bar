import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  IceCreamCone,
  Settings as SettingsIcon,
  Users as UsersIcon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useOrderAlerts } from '../lib/useOrderAlerts'

const NAV = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'سفارش‌ها', icon: ClipboardList },
  { to: '/menu', label: 'منو', icon: UtensilsCrossed },
  { to: '/ice-cream', label: 'گزینه‌های بستنی', icon: IceCreamCone },
  { to: '/settings', label: 'تنظیمات', icon: SettingsIcon },
  { to: '/users', label: 'کاربران', icon: UsersIcon, roles: ['SUPER_ADMIN'] },
]

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  useOrderAlerts()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">C</div>
          <div>
            <strong>Chill Bar</strong>
            <span>پنل مدیریت</span>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.filter((item) => !item.roles || item.roles.includes(user?.role ?? '')).map(
            (item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-avatar">{user?.name?.[0] ?? 'C'}</div>
            <div className="admin-user-info">
              <strong>{user?.name}</strong>
              <span>{roleLabel(user?.role)}</span>
            </div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            <LogOut size={18} />
            خروج
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

function roleLabel(role?: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'مدیر کل'
    case 'MANAGER':
      return 'مدیر'
    case 'STAFF':
      return 'کارمند'
    default:
      return ''
  }
}
