import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, ExternalLink, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useRemoteSession } from './useRemoteSession'
import { SessionChat } from './SessionChat'
import { buildEnrollmentCommands, callEnrollmentTokenGenerate } from '@/lib/enrollment'
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
  return status === 'aceptada' ? 'aceptada / preparando conexión' : status
}

function getConnectionPhaseLabel(phase: string) {
  switch (phase) {
    case 'awaiting-user-acceptance':
      return 'Esperando aceptación del usuario'
    case 'awaiting-rustdesk-install':
      return 'Esperando instalación del agente'
    case 'awaiting-otp':
      return 'Esperando OTP automática del agente'
    case 'awaiting-rustdesk-credentials':
      return 'Esperando credenciales de RustDesk'
    case 'ready-for-technician':
      return 'Lista para el técnico'
    case 'active':
      return 'Sesión en curso'
    case 'closing':
      return 'Cerrando sesión'
    case 'failed':
      return 'Sesión fallida'
    default:
      return phase
  }
}

export default function RemoteSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [uiError, setUiError] = useState<string | null>(null)
  const [generatingEnrollment, setGeneratingEnrollment] = useState(false)
  const [enrollmentCommands, setEnrollmentCommands] = useState<ReturnType<
    typeof buildEnrollmentCommands
  > | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const {
    device,
    session,
    error,
    rustdesk,
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
  } = useRemoteSession(sessionId ?? null, profile?.id ?? null)

  const isSharer = !!device?.owner_id && device.owner_id === profile?.id
  const isViewer = session?.initiated_by === profile?.id

  const sessionStatus = session?.status
  const isOpen = !!sessionStatus && OPEN_STATUSES.includes(sessionStatus)
  const isTerminal = !!sessionStatus && TERMINAL_STATUSES.includes(sessionStatus)
  const isPending = sessionStatus === 'pendiente'
  const isAccepted = sessionStatus === 'aceptada'
  const isActive = sessionStatus === 'activa'
  const canViewerCancel = isViewer && (isPending || isAccepted)
  const isDeviceEnrolled = !!device?.rustdesk_id
  const hasOtp = !!session?.otp

  async function handleAccept() {
    setUiError(null)
    await startAsSharer()
  }

  async function handleReject() {
    setUiError(null)
    await rejectSession()
    navigate(-1)
  }

  async function handleViewerCancel() {
    setUiError(null)
    await cancelSession()
    navigate(-1)
  }

  async function handleEndSession() {
    setUiError(null)
    await endSession('finalizada')
  }

  async function handleGenerateEnrollment() {
    if (!device?.id) {
      setUiError('No encontramos el dispositivo de esta sesión.')
      return
    }

    setGeneratingEnrollment(true)
    setUiError(null)
    setCopyFeedback(null)

    const { token, error: enrollmentError } = await callEnrollmentTokenGenerate(device.id)
    if (enrollmentError || !token) {
      setUiError(enrollmentError ?? 'No se pudo generar el token de enrollment.')
      setGeneratingEnrollment(false)
      return
    }

    setEnrollmentCommands(buildEnrollmentCommands(device.id, token))
    setCopyFeedback('Token generado. Compartile al usuario el comando que corresponda a su equipo.')
    setGeneratingEnrollment(false)
  }

  async function copyToClipboard(label: string, value?: string | null) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopyFeedback(`${label} copiado.`)
    } catch {
      setCopyFeedback(`No se pudo copiar ${label}.`)
    }
  }

  if (!session) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Cargando sesión…</div>
  }

  const combinedError = uiError ?? error

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

      <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Fase actual</p>
          <p className="font-medium">{getConnectionPhaseLabel(session.connection_phase)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dispositivo</p>
          <p className="font-medium">{device?.name ?? 'Cargando…'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Solicitud creada</p>
          <p className="font-medium">{new Date(session.created_at).toLocaleString('es-ES')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Aceptada</p>
          <p className="font-medium">{session.accepted_at ? new Date(session.accepted_at).toLocaleString('es-ES') : 'Pendiente'}</p>
        </div>
      </div>

      {rustdesk.usingPublicNetwork ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          Modo contingencia activo: usá RustDesk en su red pública (sin configurar ID Server/Relay/Key).
          Si habías cargado servidor privado en RustDesk, restablecé a configuración oficial.
        </div>
      ) : (
        (!rustdesk.idServer || !rustdesk.key) && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
            Configuración incompleta: definí <strong>VITE_RUSTDESK_ID_SERVER</strong> y{' '}
            <strong>VITE_RUSTDESK_KEY</strong>.
          </div>
        )
      )}

      {combinedError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {combinedError}
        </div>
      )}

      {copyFeedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {copyFeedback}
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
            <h2 className="text-base font-semibold">
              {isDeviceEnrolled ? 'Tu equipo ya está preparado' : 'Falta instalar el agente de asistencia'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isDeviceEnrolled
                ? 'No hace falta que copies nada manualmente. El agente genera la OTP y se la pasa al técnico automáticamente.'
                : 'Este dispositivo todavía no tiene el agente instalado. Soporte te va a compartir el comando de instalación para dejarlo listo.'}
            </p>
          </div>

          {isDeviceEnrolled ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Estado del agente</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>
                    ID de RustDesk registrado:{' '}
                    <strong className="text-foreground">{device?.rustdesk_id ?? '—'}</strong>
                  </p>
                  <p>
                    OTP automática:{' '}
                    <strong className="text-foreground">
                      {session.otp ? 'ya generada' : 'pendiente, esperá unos segundos'}
                    </strong>
                  </p>
                  {session.otp_expires_at && (
                    <p>
                      Vence:{' '}
                      <strong className="text-foreground">
                        {new Date(session.otp_expires_at).toLocaleString('es-ES')}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              {session.otp ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  Listo: soporte ya recibió el código de acceso y puede conectarse.
                </div>
              ) : (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Estamos esperando que el agente del equipo genere la OTP. Dejá esta pantalla abierta.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              Soporte necesita ejecutar el script de enrollment una sola vez en este equipo. Apenas termine, la sesión
              pasa automáticamente a la fase de OTP y no vas a tener que copiar ningún dato manual.
            </div>
          )}
        </div>
      )}

      {isSharer && isActive && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sesión en curso. El técnico está conectado por RustDesk.
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
        <div className="space-y-4 rounded-lg border bg-card p-6">
          {!isDeviceEnrolled ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                <p className="font-medium">Este equipo todavía no tiene el agente instalado</p>
                <p className="mt-2 text-xs">
                  Generá un token de enrollment y compartile al usuario el comando según su sistema operativo. Cuando
                  termine la instalación, esta pantalla se actualiza sola y vas a recibir el ID + OTP automáticos.
                </p>
              </div>

              <button
                onClick={handleGenerateEnrollment}
                disabled={generatingEnrollment}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingEnrollment ? 'Generando…' : 'Generar token de enrollment'}
              </button>

              {enrollmentCommands && (
                <div className="space-y-4 rounded-md border bg-muted/30 p-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">macOS</p>
                      <button
                        onClick={() => void copyToClipboard('comando de macOS', enrollmentCommands.macCommand)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar comando
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
                      <code>{enrollmentCommands.macCommand}</code>
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Windows</p>
                      <button
                        onClick={() => void copyToClipboard('comando de Windows', enrollmentCommands.windowsCommand)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar comando
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
                      <code>{enrollmentCommands.windowsCommand}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : hasOtp ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
              {rustdesk.nativeSessionSummary && (
                <div className="flex justify-end">
                  <button
                    onClick={() => void copyToClipboard('datos completos de RustDesk', rustdesk.nativeSessionSummary)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar datos completos
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  ID remoto: <strong>{device?.rustdesk_id}</strong>
                </p>
                <button
                  onClick={() => void copyToClipboard('ID de RustDesk', device?.rustdesk_id)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar ID
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  OTP temporal: <strong>{session.otp}</strong>
                </p>
                <button
                  onClick={() => void copyToClipboard('OTP temporal', session.otp)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar OTP
                </button>
              </div>

              {session.otp_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Vence el {new Date(session.otp_expires_at).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">
              <p>El agente ya está instalado.</p>
              <p className="mt-1">
                ID registrado: <strong className="text-foreground">{device?.rustdesk_id}</strong>
              </p>
              <p className="mt-1">Esperando que el agente genere la OTP automática…</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => void startAsViewer()}
              disabled={!device?.rustdesk_id || !session.otp}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Marcar sesión en curso
            </button>

            {(rustdesk.sessionWebClientUrl || rustdesk.webClientUrl) && (
              <a
                href={rustdesk.sessionWebClientUrl || rustdesk.webClientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir web client (opcional)
              </a>
            )}
          </div>
        </div>
      )}

      {isViewer && isActive && (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Abrí tu cliente RustDesk local y conectate usando el ID del usuario.</p>
            {device?.rustdesk_id && (
              <button
                onClick={() => void copyToClipboard('datos completos de RustDesk', rustdesk.nativeSessionSummary)}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar datos de conexión
              </button>
            )}
          </div>
          {(rustdesk.sessionWebClientUrl || rustdesk.webClientUrl) && (
            <a
              href={rustdesk.sessionWebClientUrl || rustdesk.webClientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir web client (opcional)
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            Control Issue coordina la sesión y RustDesk ejecuta la conexión remota.
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
