import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Orders } from './pages/Orders'
import { MenuManager } from './pages/MenuManager'
import { MenuQuickEntry } from './pages/MenuQuickEntry'
import { IceCreamManager } from './pages/IceCreamManager'
import { Settings } from './pages/Settings'
import { Users } from './pages/Users'
import { PosRegister } from './pages/pos/PosRegister'
import { PosShiftHistory } from './pages/pos/PosShiftHistory'
import { FinancialReports } from './pages/FinancialReports'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">C</div>
        <span>در حال بارگذاری…</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/pos"
        element={
          <Protected>
            <PosRegister />
          </Protected>
        }
      />
      <Route
        path="/pos/shifts"
        element={
          <Protected>
            <PosShiftHistory />
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="menu/quick" element={<MenuQuickEntry />} />
        <Route path="ice-cream" element={<IceCreamManager />} />
        <Route path="reports" element={<FinancialReports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
