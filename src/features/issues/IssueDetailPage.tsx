import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database, IssueStatus } from '@/types'
import { cn } from '@/lib/utils'

type Issue = Database['public']['Tables']['issues']['Row']
type Comment = Database['public']['Tables']['issue_comments']['Row']
type Device = Database['public']['Tables']['devices']['Row']
type Assignee = { id: string; name: string; role: string }

const STATUS_OPTIONS: IssueStatus[] = ['abierto', 'en-progreso', 'resuelto', 'cerrado']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
]
const OPEN_REMOTE_SESSION_STATUSES: Database['public']['Tables']['remote_sessions']['Row']['status'][] = [
  'pendiente',
  'aceptada',
  'activa',
]

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [fileError, setFileError] = useState<string | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [startingSession, setStartingSession] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const canInitiateRemote =
    profile?.role === 'admin-it' || profile?.role === 'technician'

  // Fetch issue
  useEffect(() => {
    if (!id) return
    supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setIssue(data)
        setLoading(false)
      })
  }, [id])

  // Fetch technicians + admins for assignment (admin-it only)
  useEffect(() => {
    if (profile?.role !== 'admin-it') return
    supabase
      .from('profiles')
      .select('id, name, role')
      .in('role', ['technician', 'admin-it'])
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setAssignees(data ?? []))
  }, [profile?.role])

  // Fetch devices for remote session (only for technician/admin)
  useEffect(() => {
    if (!canInitiateRemote || !issue?.created_by) return
    const ownerId = issue.created_by

    async function loadDevices() {
      const { data } = await supabase
        .from('devices')
        .select('*')
        .eq('owner_id', ownerId)

      setDevices(data ?? [])
      if (data?.length) {
        setSelectedDevice((current) =>
          current && data.some((device) => device.id === current) ? current : data[0].id
        )
      } else {
        setSelectedDevice('')
      }
    }

    void loadDevices()

    const channel = supabase
      .channel(`issue_devices:${ownerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices', filter: `owner_id=eq.${ownerId}` },
        () => {
          void loadDevices()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [canInitiateRemote, issue?.created_by])

  // Fetch and subscribe to comments
  useEffect(() => {
    if (!id) return

    supabase
      .from('issue_comments')
      .select('*')
      .eq('issue_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []))

    const channel = supabase
      .channel(`issue_comments:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issue_comments', filter: `issue_id=eq.${id}` },
        (payload) => setComments((prev) => [...prev, payload.new as Comment])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handleAssign(assigneeId: string) {
    if (!id) return
    const newAssignedTo = assigneeId || null
    const { data } = await supabase
      .from('issues')
      .update({
        assigned_to: newAssignedTo,
        status: newAssignedTo && issue?.status === 'abierto' ? 'en-progreso' : issue?.status,
      })
      .eq('id', id)
      .select()
      .single()
    if (data) setIssue(data)
  }

  async function handleStatusChange(newStatus: IssueStatus) {
    if (!id) return
    const { data } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()
    if (data) setIssue(data)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim() || !id || !profile) return
    await supabase.from('issue_comments').insert({
      issue_id: id,
      author_id: profile.id,
      body: commentBody.trim(),
    })
    setCommentBody('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || !profile) return
    setFileError(null)

    if (file.size > MAX_FILE_BYTES) {
      setFileError('El archivo supera el límite de 5 MB.')
      return
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      setFileError('Tipo de archivo no permitido.')
      return
    }

    const path = `${id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('issue-attachments')
      .upload(path, file)

    if (uploadError) { setFileError(uploadError.message); return }

    await supabase.from('issue_attachments').insert({
      issue_id: id,
      storage_path: path,
      file_name: file.name,
      uploaded_by: profile.id,
    })
  }

  async function handleStartRemoteSession() {
    if (!selectedDevice || !profile || !id) return
    setRemoteError(null)
    const device = devices.find((d) => d.id === selectedDevice)
    if (!device?.is_online) {
      setRemoteError('El dispositivo no está en línea todavía. Esperá a que el usuario aparezca como disponible.')
      return
    }

    const { data: existingOpenSession } = await supabase
      .from('remote_sessions')
      .select('id')
      .eq('target_device_id', selectedDevice)
      .in('status', OPEN_REMOTE_SESSION_STATUSES)
      .maybeSingle()

    if (existingOpenSession) {
      navigate(`/remote/${existingOpenSession.id}`)
      return
    }

    setStartingSession(true)
    const { data, error } = await supabase
      .from('remote_sessions')
      .insert({
        issue_id: id,
        initiated_by: profile.id,
        target_device_id: selectedDevice,
        status: 'pendiente',
      })
      .select()
      .single()

    setStartingSession(false)
    if (error) {
      if (
        error.code === '23505' ||
        error.message.includes('remote_sessions_one_open_per_device_idx')
      ) {
        const { data: conflictedOpenSession } = await supabase
          .from('remote_sessions')
          .select('id')
          .eq('target_device_id', selectedDevice)
          .in('status', OPEN_REMOTE_SESSION_STATUSES)
          .maybeSingle()

        if (conflictedOpenSession) {
          navigate(`/remote/${conflictedOpenSession.id}`)
          return
        }
      }

      setRemoteError(error.message)
      return
    }

    if (data) {
      navigate(`/remote/${data.id}`)
    }
  }

  const canChangeStatus =
    profile?.role === 'admin-it' ||
    (profile?.role === 'technician' && issue?.assigned_to === profile.id)

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
  if (!issue) return <div className="py-8 text-center text-sm text-destructive">Incidencia no encontrada.</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">{issue.title}</h1>
          {canChangeStatus && (
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
        {issue.description && (
          <p className="mt-3 text-sm text-muted-foreground">{issue.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Prioridad: <strong>{issue.priority}</strong></span>
          <span>Estado: <strong>{issue.status}</strong></span>
        </div>
      </div>

      {/* Assignment (admin-it only) */}
      {profile?.role === 'admin-it' && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Asignación</h2>
          <select
            value={issue.assigned_to ?? ''}
            onChange={(e) => handleAssign(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sin asignar</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.role})
              </option>
            ))}
          </select>
          {issue.assigned_to && (
            <p className="mt-1 text-xs text-muted-foreground">
              Asignado. Al asignar a alguien el estado pasa automáticamente a <strong>en-progreso</strong>.
            </p>
          )}
        </div>
      )}

      {/* Remote assistance (task 6.4) */}
      {canInitiateRemote && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Monitor className="h-4 w-4" />
            Asistencia remota
          </h2>
          {remoteError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {remoteError}
            </div>
          )}
          {devices.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              El usuario no tiene dispositivos registrados.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.is_online ? '🟢' : '🔴'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartRemoteSession}
                disabled={startingSession || !devices.find((d) => d.id === selectedDevice)?.is_online}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                )}
              >
                {startingSession ? 'Iniciando...' : 'Iniciar asistencia remota'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Adjuntos</h2>
        <label className="cursor-pointer rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
          + Subir archivo (máx. 5 MB)
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
        {fileError && <p className="mt-1 text-xs text-destructive">{fileError}</p>}
      </div>

      {/* Comments */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Comentarios</h2>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin comentarios todavía.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              <p>{c.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString('es-ES')}
              </p>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        <form onSubmit={handleComment} className="mt-3 flex gap-2">
          <input
            type="text"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Escribe un comentario..."
            className={cn(
              'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          />
          <button
            type="submit"
            disabled={!commentBody.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
