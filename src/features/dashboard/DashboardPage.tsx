import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, Clock, Monitor } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'

type Issue = Database['public']['Tables']['issues']['Row']
type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']

interface KPIs {
  open: number
  inProgress: number
  resolvedToday: number
  activeSessions: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [kpis, setKpis] = useState<KPIs>({ open: 0, inProgress: 0, resolvedToday: 0, activeSessions: 0 })
  const [recentIssues, setRecentIssues] = useState<Issue[]>([])
  const [activeSessions, setActiveSessions] = useState<RemoteSession[]>([])

  const isAdmin = profile?.role === 'admin-it'
  const isTechnician = profile?.role === 'technician'

  useEffect(() => {
    if (!profile) return

    async function loadData() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Issues query — RLS applies role filtering automatically
      const { data: issues } = await supabase
        .from('issues')
        .select('*')
        .order('updated_at', { ascending: false })

      const allIssues = issues ?? []
      const open = allIssues.filter((i) => i.status === 'abierto').length
      const inProgress = allIssues.filter((i) => i.status === 'en-progreso').length
      const resolvedToday = allIssues.filter(
        (i) => i.status === 'resuelto' && new Date(i.updated_at) >= today
      ).length

      setRecentIssues(allIssues.slice(0, 5))

      // Active remote sessions
      const { data: sessions } = await supabase
        .from('remote_sessions')
        .select('*')
        .eq('status', 'activa')

      const sessionsData = sessions ?? []
      setActiveSessions(sessionsData)

      setKpis({ open, inProgress, resolvedToday, activeSessions: sessionsData.length })
    }

    loadData()

    // Realtime: issues (task 7.3)
    const issuesChannel = supabase
      .channel('dashboard_issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'remote_sessions' }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(issuesChannel) }
  }, [profile])

  const kpiCards = [
    { label: 'Abiertos', value: kpis.open, icon: <AlertCircle className="h-5 w-5 text-blue-500" />, color: 'border-blue-200' },
    { label: 'En progreso', value: kpis.inProgress, icon: <Clock className="h-5 w-5 text-yellow-500" />, color: 'border-yellow-200' },
    { label: 'Resueltos hoy', value: kpis.resolvedToday, icon: <CheckCircle className="h-5 w-5 text-green-500" />, color: 'border-green-200' },
    { label: 'Sesiones activas', value: kpis.activeSessions, icon: <Monitor className="h-5 w-5 text-purple-500" />, color: 'border-purple-200' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        {isAdmin ? 'Panel de control' : isTechnician ? 'Mi carga de trabajo' : 'Mis incidencias'}
      </h1>

      {/* KPI cards (task 7.1 + 7.2) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={cn('rounded-lg border bg-card p-4', card.color)}>
            <div className="flex items-center justify-between">
              {card.icon}
              <span className="text-2xl font-bold">{card.value}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent issues (task 7.4) */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Incidencias recientes</h2>
          </div>
          <div className="divide-y">
            {recentIssues.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin incidencias.</p>
            )}
            {recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/30"
              >
                <span className="truncate font-medium">{issue.title}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize">
                  {issue.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Active sessions (task 7.3) */}
        {(isAdmin || isTechnician) && (
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Sesiones remotas activas</h2>
            </div>
            <div className="divide-y">
              {activeSessions.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Sin sesiones activas.</p>
              )}
              {activeSessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/remote/${s.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                >
                  <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">Sesión {s.id.slice(0, 8)}…</span>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    activa
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
