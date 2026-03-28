import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, CheckCircle, Clock, MessageSquare,
  Paperclip, Monitor, UserX, UserCheck, Users, Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { ActivityEventType, Database } from '@/types'
import { cn } from '@/lib/utils'

type ActivityLog = Database['public']['Tables']['activity_log']['Row']

const PAGE_SIZE = 20

// -------------------------------------------------------
// Filter categories
// -------------------------------------------------------
type FilterCategory = 'all' | 'issues' | 'comments' | 'sessions' | 'users'

const FILTERS: { id: FilterCategory; label: string }[] = [
  { id: 'all',      label: 'Todos' },
  { id: 'issues',   label: 'Incidencias' },
  { id: 'comments', label: 'Comentarios' },
  { id: 'sessions', label: 'Sesiones' },
  { id: 'users',    label: 'Usuarios' },
]

const CATEGORY_TYPES: Record<FilterCategory, ActivityEventType[]> = {
  all:      [],
  issues:   ['issue_created', 'status_changed', 'issue_assigned', 'attachment_added'],
  comments: ['comment_added'],
  sessions: ['session_started', 'session_ended', 'session_rejected'],
  users:    ['user_created', 'user_deactivated', 'user_reactivated'],
}

// -------------------------------------------------------
// 3.6 Event icon + color
// -------------------------------------------------------
interface EventStyle { icon: React.ReactNode; bg: string; dot: string }

function getEventStyle(type: ActivityEventType, meta: Record<string, string | null>): EventStyle {
  switch (type) {
    case 'issue_created':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        bg: meta.priority === 'critica' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-blue-50 dark:bg-blue-950/20',
        dot: meta.priority === 'critica' ? 'bg-red-500' : 'bg-blue-500',
      }
    case 'status_changed':
      return {
        icon: <Clock className="h-4 w-4" />,
        bg: meta.new_status === 'resuelto' || meta.new_status === 'cerrado'
          ? 'bg-green-50 dark:bg-green-950/20'
          : 'bg-yellow-50 dark:bg-yellow-950/20',
        dot: meta.new_status === 'resuelto' || meta.new_status === 'cerrado' ? 'bg-green-500' : 'bg-yellow-500',
      }
    case 'issue_assigned':
      return { icon: <Users className="h-4 w-4" />, bg: 'bg-purple-50 dark:bg-purple-950/20', dot: 'bg-purple-500' }
    case 'comment_added':
      return { icon: <MessageSquare className="h-4 w-4" />, bg: 'bg-muted/40', dot: 'bg-slate-400' }
    case 'attachment_added':
      return { icon: <Paperclip className="h-4 w-4" />, bg: 'bg-muted/40', dot: 'bg-slate-400' }
    case 'session_started':
      return { icon: <Monitor className="h-4 w-4" />, bg: 'bg-indigo-50 dark:bg-indigo-950/20', dot: 'bg-indigo-500' }
    case 'session_ended':
      return { icon: <CheckCircle className="h-4 w-4" />, bg: 'bg-green-50 dark:bg-green-950/20', dot: 'bg-green-500' }
    case 'session_rejected':
      return { icon: <Monitor className="h-4 w-4" />, bg: 'bg-red-50 dark:bg-red-950/20', dot: 'bg-red-400' }
    case 'user_created':
      return { icon: <Users className="h-4 w-4" />, bg: 'bg-emerald-50 dark:bg-emerald-950/20', dot: 'bg-emerald-500' }
    case 'user_deactivated':
      return { icon: <UserX className="h-4 w-4" />, bg: 'bg-red-50 dark:bg-red-950/20', dot: 'bg-red-500' }
    case 'user_reactivated':
      return { icon: <UserCheck className="h-4 w-4" />, bg: 'bg-green-50 dark:bg-green-950/20', dot: 'bg-green-500' }
    default:
      return { icon: <Zap className="h-4 w-4" />, bg: 'bg-muted/40', dot: 'bg-slate-400' }
  }
}

// -------------------------------------------------------
// 3.7 Event label
// -------------------------------------------------------
function getEventLabel(event: ActivityLog): { title: string; detail?: string } {
  const m = (event.metadata ?? {}) as Record<string, string | null>
  switch (event.type) {
    case 'issue_created':
      return { title: `${m.created_by_name ?? 'Sistema'} creó "${m.title}"`, detail: m.priority ?? undefined }
    case 'status_changed':
      return { title: `Estado de "${m.title}" cambió a ${m.new_status}`, detail: `antes: ${m.old_status}` }
    case 'issue_assigned':
      return { title: `"${m.title}" asignada a ${m.assigned_to_name}` }
    case 'comment_added':
      return { title: `${m.author_name ?? 'Usuario'} comentó en "${m.issue_title}"`, detail: m.body_preview ?? undefined }
    case 'attachment_added':
      return { title: `Adjunto "${m.file_name}" en "${m.issue_title}"` }
    case 'session_started':
      return { title: `Sesión remota iniciada`, detail: `${m.device_name} · ${m.issue_title}` }
    case 'session_ended':
      return { title: `Sesión remota finalizada` }
    case 'session_rejected':
      return { title: `Sesión remota rechazada` }
    case 'user_created':
      return { title: `Nuevo usuario: ${m.name}`, detail: m.email ?? undefined }
    case 'user_deactivated':
      return { title: `${m.name} desactivado`, detail: m.email ?? undefined }
    case 'user_reactivated':
      return { title: `${m.name} reactivado`, detail: m.email ?? undefined }
    default:
      return { title: event.type }
  }
}

// -------------------------------------------------------
// 3.8 Relative timestamp
// -------------------------------------------------------
function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ayer'
  return `hace ${days}d`
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------
interface ActivityFeedProps {
  variant?: 'card' | 'drawer'
  channelName?: string
}

export default function ActivityFeed({ variant = 'card', channelName = 'activity_feed' }: ActivityFeedProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<FilterCategory>('all')

  // 3.1 Initial load
  async function loadInitial() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    setEvents(data ?? [])
    setHasMore((data ?? []).length === PAGE_SIZE)
    setLoading(false)
  }

  useEffect(() => {
    loadInitial()

    // 3.2 Realtime: prepend new events
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => setEvents((prev) => [payload.new as ActivityLog, ...prev])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelName])

  // 3.3 Load more
  async function loadMore() {
    setLoadingMore(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(events.length, events.length + PAGE_SIZE - 1)
    const next = data ?? []
    setEvents((prev) => [...prev, ...next])
    setHasMore(next.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  // 3.4 + 3.5 Client-side filter
  const filtered = filter === 'all'
    ? events
    : events.filter((e) => CATEGORY_TYPES[filter].includes(e.type as ActivityEventType))

  const isDrawer = variant === 'drawer'

  return (
    <div className={cn(!isDrawer && 'rounded-lg border bg-card', isDrawer && 'flex h-full flex-col')}>
      {/* Header: solo en modo card (el drawer tiene el suyo propio) */}
      {!isDrawer && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <h2 className="text-sm font-semibold">Actividad</h2>
            {events.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {events.length}
              </span>
            )}
          </div>

          {/* 3.4 Filter chips */}
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips en modo drawer: barra dedicada debajo del header del drawer */}
      {isDrawer && (
        <div className="flex flex-wrap gap-1 border-b px-4 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className={cn(isDrawer ? 'flex-1 overflow-y-auto' : 'max-h-96 overflow-y-auto')}>
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Cargando actividad...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin eventos.</p>
        )}

        {!loading && filtered.map((event) => {
          const style  = getEventStyle(event.type as ActivityEventType, (event.metadata ?? {}) as Record<string, string | null>)
          const label  = getEventLabel(event)
          // 3.9 clickable if entity is an issue
          const isClickable = event.entity_type === 'issue' && event.entity_id

          return (
            <div
              key={event.id}
              onClick={() => isClickable && navigate(`/issues/${event.entity_id}`)}
              className={cn(
                'flex items-start gap-3 border-b px-4 py-3 text-sm last:border-0',
                style.bg,
                isClickable && 'cursor-pointer hover:brightness-95 transition-all'
              )}
            >
              {/* Colored dot + icon */}
              <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', style.dot)}>
                {style.icon}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{label.title}</p>
                {label.detail && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{label.detail}</p>
                )}
                {/* 3.11 actor_id null → "Sistema" */}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.actor_id ? '' : 'Sistema · '}
                  <span title={new Date(event.created_at).toLocaleString('es-ES')}>
                    {formatRelative(event.created_at)}
                  </span>
                </p>
              </div>
            </div>
          )
        })}

        {/* Load more */}
        {!loading && hasMore && filter === 'all' && (
          <div className="px-4 py-3 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
