import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, XCircle } from 'lucide-react'
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
  const [deviceOwnerId, setDeviceOwnerId] = useState<string | null>(null)

  const {
    session,
    error,
    meshcentralUrl,
    meshcentralAgentInviteUrl,
    meshcentralAgentDownloads,
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

  const isSharer = !!deviceOwnerId && deviceOwnerId === profile?.id
  const isViewer = session?.initiated_by === profile?.id

  const sessionStatus = session?.status
  const isOpen = !!sessionStatus && OPEN_STATUSES.includes(sessionStatus)
  const isTerminal = !!sessionStatus && TERMINAL_STATUSES.includes(sessionStatus)
  const isPending = sessionStatus === 'pendiente'
  const isAccepted = sessionStatus === 'aceptada'
  const isActive = sessionStatus === 'activa'
  const canViewerCancel = isViewer && (isPending || isAccepted)
  const preferredAgentKey = useMemo(() => {
    if (typeof window === 'undefined') return null
    const navigatorWithUAData = navigator as Navigator & {
      userAgentData?: { platform?: string; architecture?: string }
    }
    const platform =
      (navigatorWithUAData.userAgentData?.platform ?? navigator.platform ?? '').toLowerCase()
    const architecture = (navigatorWithUAData.userAgentData?.architecture ?? '').toLowerCase()
    const userAgent = navigator.userAgent.toLowerCase()

    if (platform.includes('win') || userAgent.includes('windows')) return 'windows'
    if (platform.includes('mac') || userAgent.includes('mac os x')) {
      if (
        architecture.includes('arm') ||
        userAgent.includes('arm64') ||
        userAgent.includes('aarch64')
      ) {
        return 'macArm'
      }
      if (
        architecture.includes('x86') ||
        architecture.includes('intel') ||
        userAgent.includes('x86_64') ||
        userAgent.includes('intel')
      ) {
        return 'macIntel'
      }
    }

    return null
  }, [])
  const agentOptions = [
    {
      key: 'windows',
      label: 'Windows',
      description: 'PC con Windows 64-bit',
      href: meshcentralAgentDownloads.windows,
    },
    {
      key: 'macIntel',
      label: 'Mac Intel',
      description: 'Mac con procesador Intel',
      href: meshcentralAgentDownloads.macIntel,
    },
    {
      key: 'macArm',
      label: 'Mac Apple Silicon',
      description: 'Mac M1/M2/M3/M4',
      href: meshcentralAgentDownloads.macArm,
    },
  ] as const
  const availableAgentOptions = agentOptions.filter((option) => !!option.href)

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

      {!meshcentralUrl && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
          MeshCentral URL no configurada. Configurá VITE_MESHCENTRAL_URL en el entorno.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
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
              Aceptar
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
        <div className="space-y-6 rounded-lg border bg-card p-6">
          <div className="text-center">
            <h2 className="text-base font-semibold">Instalá el agente de asistencia remota</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Para continuar la asistencia, descargá e instalá el agente remoto. El técnico va a seguir desde MeshCentral en otra pestaña.
            </p>
          </div>

          {meshcentralAgentInviteUrl && (
            <div className="text-center">
              <a
                href={meshcentralAgentInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir instalador guiado de MeshCentral
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Recomendado: este enlace suele incluir el dispositivo preasignado.
              </p>
            </div>
          )}

          {availableAgentOptions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {availableAgentOptions.map((option) => {
                const isRecommended = preferredAgentKey === option.key
                return (
                  <a
                    key={option.key}
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'rounded-md border px-3 py-3 text-left text-sm transition-colors hover:bg-accent',
                      isRecommended && 'border-primary ring-1 ring-primary'
                    )}
                  >
                    <span className="inline-flex items-center gap-1 font-medium">
                      <ExternalLink className="h-4 w-4" />
                      {option.label}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                    {isRecommended && (
                      <p className="mt-2 text-[11px] font-medium text-primary">Recomendado para este equipo</p>
                    )}
                  </a>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No hay enlaces de descarga configurados para este entorno.
            </p>
          )}

          <ol className="mx-auto max-w-xs space-y-1 text-sm text-muted-foreground">
            <li>1. Descargá el instalador según tu sistema operativo</li>
            <li>2. Ejecutalo y seguí los pasos</li>
            <li>3. Permití captura de pantalla/accesibilidad si macOS lo pide</li>
            <li>4. Avisale al técnico cuando el agente quede listo</li>
          </ol>
        </div>
      )}

      {isSharer && isActive && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sesión en curso. El técnico continúa la asistencia desde MeshCentral.
          </p>
        </div>
      )}

      {isViewer && isPending && (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <p className="animate-pulse text-sm text-muted-foreground">
            Esperando que el usuario acepte la solicitud…
          </p>
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

      {isViewer && isAccepted && (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            El usuario aceptó. Pedile que instale el agente si aún no lo hizo. Cuando lo tengas listo, abrí MeshCentral y marcá la sesión como en curso.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {meshcentralUrl && (
              <a
                href={meshcentralUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir MeshCentral
              </a>
            )}
            <button
              onClick={() => void startAsViewer()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Marcar sesión en curso
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Por ahora la asociación entre esta sesión y el dispositivo dentro de MeshCentral sigue siendo manual.
          </p>
        </div>
      )}

      {isViewer && isActive && (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
          {meshcentralUrl ? (
            <a
              href={meshcentralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir MeshCentral
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configurá VITE_MESHCENTRAL_URL para acceder al panel de control remoto.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Control Issue coordina la sesión, pero la conexión remota real ocurre dentro de MeshCentral.
          </p>
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

      {isOpen && isActive && (
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
