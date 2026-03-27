import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useIssues } from './useIssues'
import { IssueFilters } from './IssueFilters'
import { CreateIssueForm } from './CreateIssueForm'
import type { IssueStatus, IssuePriority } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<IssueStatus, string> = {
  abierto: 'Abierto',
  'en-progreso': 'En progreso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

const STATUS_COLORS: Record<IssueStatus, string> = {
  abierto: 'bg-blue-100 text-blue-800',
  'en-progreso': 'bg-yellow-100 text-yellow-800',
  resuelto: 'bg-green-100 text-green-800',
  cerrado: 'bg-gray-100 text-gray-700',
}

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  baja: 'bg-slate-100 text-slate-700',
  media: 'bg-orange-100 text-orange-700',
  alta: 'bg-red-100 text-red-700',
  critica: 'bg-red-200 text-red-900 font-semibold',
}

export default function IssuesListPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<IssueStatus | ''>('')
  const [priority, setPriority] = useState<IssuePriority | ''>('')
  const [showCreate, setShowCreate] = useState(false)

  const { issues, loading, error, createIssue } = useIssues({
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
  })

  async function handleCreate(data: {
    title: string
    description: string
    priority: IssuePriority
  }) {
    await createIssue(data)
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Incidencias</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva incidencia
        </button>
      </div>

      {/* Create issue modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Nueva incidencia</h2>
            <CreateIssueForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      <IssueFilters
        search={search}
        status={status}
        priority={priority}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPriorityChange={setPriority}
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : issues.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">No se encontraron incidencias.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Título</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Prioridad</th>
                <th className="px-4 py-3 text-left font-medium">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.map((issue) => (
                <tr key={issue.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to={`/issues/${issue.id}`} className="font-medium hover:underline">
                      {issue.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        STATUS_COLORS[issue.status as IssueStatus]
                      )}
                    >
                      {STATUS_LABELS[issue.status as IssueStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs capitalize',
                        PRIORITY_COLORS[issue.priority as IssuePriority]
                      )}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(issue.created_at).toLocaleDateString('es-ES')}
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
