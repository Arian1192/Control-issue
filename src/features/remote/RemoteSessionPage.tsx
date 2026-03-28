import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Monitor, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useRemoteSession } from './useRemoteSession'
import { SessionChat } from './SessionChat'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import type { SessionStatus } from '@/types'

const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']
const TERMINAL_STATUSES: SessionStatus[] = ['rechazada', 'fallida', 'finalizada', 'cancelada']

function getStatusBadgeClasses(status: SessionStatus) {
  switch (status) {
    case 'activa':
      return 'bg-green-100 text-green-800'
    case 'pendiente':
    case 'aceptada':
      return 'bg-yellow-100 text-yellow-800'
    case 'rechazada':
      return 'bg-orange-100 text-orange-800'
    case 'fallida':
      return 'bg-red-100 text-red-800'
    case 'cancelada':
      return 'bg-slate-100 text-slate-700'
    case 'finalizada':
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusLabel(status: SessionStatus) {
  return status === 'aceptada' ? 'aceptada / conectando' : status
}

export default function RemoteSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewerStartedRef = useRef(false)
  const [deviceOwnerId, setDeviceOwnerId] = useState<string | null>(null)

  const {
    session,
    remoteStream,
    connectionState,
    error,
    turnConfigured,
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
  } = useRemoteSession(sessionId ?? null, profile?.id ?? null)

  useEffect(() => {
    if (!session?.target_device_id) return

    supabase
      .from('devices')
      .select('owner_id')
      .eq('id', session.target_device_id)
      .single()
      .then(({ data }) => setDeviceOwnerId(data?.owner_id ?? null))
  }, [session?.target_device_id])

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const isSharer = !!deviceOwnerId && deviceOwnerId === profile?.id
  const isViewer = session?.initiated_by === profile?.id

  useEffect(() => {
    if (!session || !isViewer || viewerStartedRef.current) return
    if (!OPEN_STATUSES.includes(session.status)) return

    viewerStartedRef.current = true
    startAsViewer()
  }, [isViewer, session, startAsViewer])

  const sessionStatus = session?.status
  const isOpen = !!sessionStatus && OPEN_STATUSES.includes(sessionStatus)
  const isTerminal = !!sessionStatus && TERMINAL_STATUSES.includes(sessionStatus)
  const isPending = sessionStatus === 'pendiente'
  const isAccepted = sessionStatus === 'aceptada'
  const isActive = sessionStatus === 'activa'
  const canViewerCancel = isViewer && (isPending || isAccepted)

  const viewerMessage = useMemo(() => {
    if (isPending) return 'Esperando que el usuario acepte la solicitud…'
    if (isAccepted) return 'El usuario aceptó. Preparando conexión y compartición de pantalla…'
    if (isActive && !remoteStream) return 'Conectando con el dispositivo…'
    return null
  }, [isAccepted, isActive, isPending, remoteStream])

  async function handleAccept() {
    await startAsSharer()
  }

  async function handleReject() {
    await rejectSession()
    navigate(-1)
  }

  async function handleViewerCancel() {
    await cancelSession()
    navigate(-1)
  }

  async function handleEndSession() {
    await endSession('finalizada')
  }

  if (!session) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Cargando sesión…</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sesión de asistencia remota</h1>
          {session.issue_id && (
            <Link
              to={`/issues/${session.issue_id}`}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Volver a la incidencia vinculada
            </Link>
          )}
        </div>

        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium capitalize',
            getStatusBadgeClasses(session.status)
          )}
        >
          {getStatusLabel(session.status)}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!turnConfigured && isViewer && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
          TURN no está configurado. Fuera de LAN la conexión es best-effort y puede fallar si no hay relay.
        </div>
      )}

      {session.failure_reason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {session.failure_reason}
        </div>
      )}

      {isSharer && isPending && (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Un técnico solicita ver tu pantalla para ayudarte con esta incidencia.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleAccept}
              className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Aceptar y compartir pantalla
            </button>
            <button
              onClick={handleReject}
              className="rounded-md bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {isSharer && isAccepted && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Compartiendo pantalla. Esperando que la conexión con el técnico termine de estabilizarse…
          </p>
        </div>
      )}

      {isViewer && viewerMessage && (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <p className="animate-pulse text-sm text-muted-foreground">{viewerMessage}</p>
          {canViewerCancel && (
            <button
              onClick={handleViewerCancel}
              className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              <XCircle className="h-4 w-4" />
              Cancelar solicitud
            </button>
          )}
        </div>
      )}

      {isTerminal && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground capitalize">
            La sesión finalizó con estado: <strong>{getStatusLabel(session.status)}</strong>
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Volver
          </button>
        </div>
      )}

      {isViewer && isOpen && (
        <div className="overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
            style={{ minHeight: '360px' }}
          />
          {!remoteStream && (
            <div className="flex h-40 items-center justify-center gap-2 text-gray-400">
              <Monitor className="h-4 w-4" />
              <p className="text-sm">Todavía no hay video remoto disponible.</p>
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connectionState === 'connected' ? 'bg-green-500' : 'animate-pulse bg-yellow-400'
            )}
          />
          {connectionState === 'connected' ? 'Conectado' : connectionState}
        </div>
      )}

      {isActive && (
        <button
          onClick={handleEndSession}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
        >
          Finalizar sesión
        </button>
      )}

      {isActive && session && profile && (
        <SessionChat sessionId={session.id} userId={profile.id} userName={profile.name} />
      )}
    </div>
  )
}
