import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getLocalIp } from '@/lib/getLocalIp'
import {
  LayoutDashboard,
  AlertCircle,
  Monitor,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ActivityFeedDrawer from '@/components/ActivityFeedDrawer'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type Device = Database['public']['Tables']['devices']['Row']

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

function sortPendingSessions(sessions: RemoteSession[]) {
  return [...sessions].sort((a, b) => a.target_device_id.localeCompare(b.target_device_id))
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingSessions, setPendingSessions] = useState<RemoteSession[]>([])
  const [devicesById, setDevicesById] = useState<Record<string, Device>>({})

  const visibleItems = NAV_ITEMS.filter((item) => !profile || item.roles.includes(profile.role))
  const accessDenied = (location.state as { accessDenied?: boolean } | null)?.accessDenied
  const pendingCount = pendingSessions.length

  const pendingSessionCards = useMemo(
    () =>
      pendingSessions.map((session) => ({
        session,
        device: devicesById[session.target_device_id] ?? null,
      })),
    [devicesById, pendingSessions]
  )

  useEffect(() => {
    if (!profile) return
    const profileId = profile.id

    async function markOnline() {
      const ip_local = await getLocalIp()
      await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          is_online: true,
          ...(ip_local !== null && { ip_local }),
        })
        .eq('owner_id', profileId)
    }

    void markOnline()
    const interval = setInterval(() => {
      void markOnline()
    }, 30_000)

    return () => {
      clearInterval(interval)
      void supabase.from('devices').update({ is_online: false }).eq('owner_id', profileId)
    }
  }, [profile])

  useEffect(() => {
    if (!profile) {
      setPendingSessions([])
      setDevicesById({})
      return
    }

    const profileId = profile.id
    let isMounted = true
    const ownedDeviceIds = new Set<string>()

    async function refreshDevicesAndPending() {
      const { data: devices } = await supabase
        .from('devices')
        .select('*')
        .eq('owner_id', profileId)

      if (!isMounted) return

      const nextDevices = devices ?? []
      ownedDeviceIds.clear()
      nextDevices.forEach((device) => ownedDeviceIds.add(device.id))
      setDevicesById(
        Object.fromEntries(nextDevices.map((device) => [device.id, device])) as Record<string, Device>
      )

      if (nextDevices.length === 0) {
        setPendingSessions([])
        return
      }

      const { data: sessions } = await supabase
        .from('remote_sessions')
        .select('*')
        .in(
          'target_device_id',
          nextDevices.map((device) => device.id)
        )
        .eq('status', 'pendiente')

      if (isMounted) {
        setPendingSessions(sortPendingSessions((sessions ?? []) as RemoteSession[]))
      }
    }

    void refreshDevicesAndPending()

    const sessionChannel = supabase
      .channel(`incoming_sessions:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'remote_sessions' },
        (payload) => {
          const session = payload.new as RemoteSession
          if (!ownedDeviceIds.has(session.target_device_id) || session.status !== 'pendiente') return

          setPendingSessions((current) => {
            const next = current.some((item) => item.id === session.id)
              ? current.map((item) => (item.id === session.id ? session : item))
              : [...current, session]
            return sortPendingSessions(next)
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'remote_sessions' },
        (payload) => {
          const session = payload.new as RemoteSession
          if (!ownedDeviceIds.has(session.target_device_id)) return

          setPendingSessions((current) => {
            if (session.status !== 'pendiente') {
              return current.filter((item) => item.id !== session.id)
            }

            const exists = current.some((item) => item.id === session.id)
            const next = exists
              ? current.map((item) => (item.id === session.id ? session : item))
              : [...current, session]
            return sortPendingSessions(next)
          })
        }
      )
      .subscribe()

    const deviceChannel = supabase
      .channel(`owned_devices:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices', filter: `owner_id=eq.${profile.id}` },
        () => {
          void refreshDevicesAndPending()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      void supabase.removeChannel(sessionChannel)
      void supabase.removeChannel(deviceChannel)
    }
  }, [profile])

  function acceptSession(sessionId: string) {
    setPendingSessions((current) => current.filter((session) => session.id !== sessionId))
    navigate(`/remote/${sessionId}`)
  }

  async function rejectSession(sessionId: string) {
    await supabase
      .from('remote_sessions')
      .update({ status: 'rechazada', ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    setPendingSessions((current) => current.filter((session) => session.id !== sessionId))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
          {profile?.role === 'admin-it' && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Abrir feed de actividad"
            >
              <Activity className="h-4 w-4" />
              Actividad en vivo
            </button>
          )}
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold">Control Issue</span>
          {profile?.role === 'admin-it' && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Abrir feed de actividad"
            >
              <Activity className="h-5 w-5" />
            </button>
          )}
        </header>

        {pendingCount > 0 && (
          <div className="border-b bg-yellow-50 px-4 py-3 text-yellow-900">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 shrink-0" />
              Tenés {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} remota{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}.
            </div>
            <div className="space-y-2">
              {pendingSessionCards.map(({ session, device }) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-2 rounded-md border border-yellow-200 bg-white/70 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p>
                      Un técnico solicita acceso remoto a{' '}
                      <strong>{device?.name ?? 'tu dispositivo'}</strong>.
                    </p>
                    <p className="text-xs text-yellow-800/80">
                      Sesión {session.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptSession(session.id)}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Abrir y aceptar
                    </button>
                    <button
                      onClick={() => rejectSession(session.id)}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {accessDenied && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              No tenés permisos para acceder a esa sección.
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <ActivityFeedDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  )
}
