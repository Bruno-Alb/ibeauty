import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useAuth } from './auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ProviderDetail from './pages/ProviderDetail'
import MyBookings from './pages/MyBookings'
import ProviderDashboard from './pages/ProviderDashboard'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="container"><p>Carregando...</p></div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/prestador/:id" element={<ProviderDetail />} />
        <Route
          path="/minhas-reservas"
          element={<RequireAuth><MyBookings /></RequireAuth>}
        />
        <Route
          path="/prestador"
          element={<RequireAuth><ProviderDashboard /></RequireAuth>}
        />
        <Route
          path="/virar-prestador"
          element={<RequireAuth><ProviderDashboard /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
