import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
