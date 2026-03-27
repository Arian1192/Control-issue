import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from '@/types'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile } = useAuth()

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace state={{ accessDenied: true }} />
  }

  return <>{children}</>
}
