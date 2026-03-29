import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'
import UserManagementPage from './UserManagementPage'

const RUSTDESK_WEB_CLIENT_URL = import.meta.env.VITE_RUSTDESK_WEB_CLIENT_URL as string | undefined

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']

export default function AdminPage() {
  const [sessions, setSessions] = useState<RemoteSession[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'audit'>('users')

  useEffect(() => {
    supabase
      .from('remote_sessions')
      .select('*')
      .eq('status', 'finalizada')
      .order('ended_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading && tab === 'audit') return <p className="text-sm text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Administración</h1>

      {/* Tabs — 6.1 added "users" tab */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {([
          ['users', 'Gestión de usuarios'],
          ['audit', 'Auditoría de sesiones'],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 6.1 User management tab */}
      {tab === 'users' && <UserManagementPage />}

      {/* Audit tab */}
      {tab === 'audit' && (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium">Sesiones finalizadas</span>
            {RUSTDESK_WEB_CLIENT_URL && (
              <a
                href={RUSTDESK_WEB_CLIENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir RustDesk web
              </a>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID sesión</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Inicio</th>
                <th className="px-4 py-3 text-left font-medium">Fin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Sin sesiones finalizadas.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{s.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.started_at ? new Date(s.started_at).toLocaleString('es-ES') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.ended_at ? new Date(s.ended_at).toLocaleString('es-ES') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
