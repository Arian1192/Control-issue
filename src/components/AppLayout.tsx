import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertCircle,
  Monitor,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['admin-it', 'technician', 'user'],
  },
  {
    to: '/issues',
    label: 'Incidencias',
    icon: <AlertCircle className="h-4 w-4" />,
    roles: ['admin-it', 'technician', 'user'],
  },
  {
    to: '/devices',
    label: 'Dispositivos',
    icon: <Monitor className="h-4 w-4" />,
    roles: ['admin-it', 'technician', 'user'],
  },
  {
    to: '/admin',
    label: 'Administración',
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin-it'],
  },
]

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingSession, setPendingSession] = useState<RemoteSession | null>(null)

  // Listen for incoming remote session requests (task 6.5)
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('incoming_sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'remote_sessions',
          filter: `status=eq.pendiente`,
        },
        async (payload) => {
          const session = payload.new as RemoteSession
          // Check if this session targets a device owned by current user
          const { data: device } = await supabase
            .from('devices')
            .select('owner_id')
            .eq('id', session.target_device_id)
            .single()
          if (device?.owner_id === profile.id) {
            setPendingSession(session)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  async function acceptSession() {
    if (!pendingSession) return
    await supabase
      .from('remote_sessions')
      .update({ status: 'activa', started_at: new Date().toISOString() })
      .eq('id', pendingSession.id)
    const sessionId = pendingSession.id
    setPendingSession(null)
    navigate(`/remote/${sessionId}`)
  }

  async function rejectSession() {
    if (!pendingSession) return
    await supabase
      .from('remote_sessions')
      .update({ status: 'rechazada' })
      .eq('id', pendingSession.id)
    setPendingSession(null)
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !profile || item.roles.includes(profile.role)
  )

  const accessDenied = (location.state as { accessDenied?: boolean } | null)?.accessDenied

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-semibold">Control Issue</span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-2">
          <div className="mb-2 px-3 py-1">
            <p className="truncate text-sm font-medium">{profile?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.role}</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold">Control Issue</span>
        </header>

        {/* Incoming session notification banner (task 6.5) */}
        {pendingSession && (
          <div className="flex items-center justify-between border-b bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <span className="flex items-center gap-2">
              <Monitor className="h-4 w-4 shrink-0" />
              Un técnico solicita acceso remoto a tu dispositivo.
            </span>
            <div className="flex gap-2">
              <button
                onClick={acceptSession}
                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                Aceptar
              </button>
              <button
                onClick={rejectSession}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {accessDenied && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              No tienes permisos para acceder a esa sección.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
