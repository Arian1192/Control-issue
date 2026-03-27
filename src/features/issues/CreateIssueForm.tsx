import { useState, type FormEvent } from 'react'
import type { IssuePriority } from '@/types'
import { cn } from '@/lib/utils'

interface CreateIssueFormProps {
  onSubmit: (data: { title: string; description: string; priority: IssuePriority }) => Promise<void>
  onCancel: () => void
}

const inputClass = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
)

export function CreateIssueForm({ onSubmit, onCancel }: CreateIssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('media')
  const [loading, setLoading] = useState(false)
  const [titleError, setTitleError] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    setLoading(true)
    await onSubmit({ title: title.trim(), description: description.trim(), priority })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Título <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
          placeholder="Describe brevemente el problema"
          className={cn(inputClass, titleError && 'border-destructive')}
        />
        {titleError && <p className="text-xs text-destructive">El título es obligatorio.</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Añade más detalles sobre el problema..."
          className={cn(inputClass, 'resize-none')}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Prioridad</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as IssuePriority)}
          className={inputClass}
        >
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear incidencia'}
        </button>
      </div>
    </form>
  )
}
