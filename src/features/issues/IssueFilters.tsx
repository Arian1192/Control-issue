import type { IssueStatus, IssuePriority } from '@/types'
import { cn } from '@/lib/utils'

interface IssueFiltersProps {
  search: string
  status: IssueStatus | ''
  priority: IssuePriority | ''
  onSearchChange: (v: string) => void
  onStatusChange: (v: IssueStatus | '') => void
  onPriorityChange: (v: IssuePriority | '') => void
}

const selectClass = cn(
  'rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
)

export function IssueFilters({
  search,
  status,
  priority,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
}: IssueFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        placeholder="Buscar incidencias..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className={cn(selectClass, 'min-w-[200px] flex-1')}
      />

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as IssueStatus | '')}
        className={selectClass}
      >
        <option value="">Todos los estados</option>
        <option value="abierto">Abierto</option>
        <option value="en-progreso">En progreso</option>
        <option value="resuelto">Resuelto</option>
        <option value="cerrado">Cerrado</option>
      </select>

      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value as IssuePriority | '')}
        className={selectClass}
      >
        <option value="">Todas las prioridades</option>
        <option value="baja">Baja</option>
        <option value="media">Media</option>
        <option value="alta">Alta</option>
        <option value="critica">Crítica</option>
      </select>
    </div>
  )
}
