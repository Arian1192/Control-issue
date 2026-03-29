import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, ExternalLink, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useRemoteSession } from './useRemoteSession'
import { SessionChat } from './SessionChat'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import type { SessionStatus } from '@/types'

const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']
const TERMINAL_STATUSES: SessionStatus[] = ['rechazada', 'fallida', 'finalizada', 'cancelada']

type AgentOptionKey = 'windows' | 'macIntel' | 'macArm' | 'linux'

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

function detectPreferredAgentKey(): AgentOptionKey | null {
  if (typeof window === 'undefined') return null

  const navigatorWithUAData = navigator as Navigator & {
    userAgentData?: { platform?: string; architecture?: string }
  }

  const platform = (navigatorWithUAData.userAgentData?.platform ?? navigator.platform ?? '').toLowerCase()
  const architecture = (navigatorWithUAData.userAgentData?.architecture ?? '').toLowerCase()
  const userAgent = navigator.userAgent.toLowerCase()

  if (platform.includes('win') || userAgent.includes('windows')) return 'windows'

  if (platform.includes('mac') || userAgent.includes('mac os x')) {
    if (architecture.includes('arm') || userAgent.includes('arm64') || userAgent.includes('aarch64')) {
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

    return 'macArm'
  }

  if (platform.includes('linux') || userAgent.includes('linux')) return 'linux'

  return null
}

function platformLabelFromAgentKey(key: AgentOptionKey | null) {
  switch (key) {
    case 'windows':
      return 'Windows'
    case 'macIntel':
      return 'macOS Intel'
    case 'macArm':
      return 'macOS Apple Silicon'
    case 'linux':
      return 'Linux'
    default:
      return ''
  }
}

export default function RemoteSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [deviceOwnerId, setDeviceOwnerId] = useState<string | null>(null)
  const [savingRustDesk, setSavingRustDesk] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [rustDeskIdInput, setRustDeskIdInput] = useState('')
  const [rustDeskPasswordInput, setRustDeskPasswordInput] = useState('')
  const [rustDeskPlatform, setRustDeskPlatform] = useState('')

  const {
    session,
    error,
    rustdesk,
    startAsSharer,
    publishRustDeskConnection,
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

  const preferredAgentKey = useMemo(() => detectPreferredAgentKey(), [])
  const preferredPlatformLabel = useMemo(() => platformLabelFromAgentKey(preferredAgentKey), [preferredAgentKey])

  useEffect(() => {
    if (!session || !isAccepted || !isSharer) return

    setRustDeskIdInput(session.rustdesk_id ?? '')
    setRustDeskPasswordInput(session.rustdesk_password ?? '')

    if (session.rustdesk_platform) {
      setRustDeskPlatform(session.rustdesk_platform)
      return
    }

    if (preferredPlatformLabel) {
      setRustDeskPlatform(preferredPlatformLabel)
    }
  }, [
    isAccepted,
    isSharer,
    preferredPlatformLabel,
    session,
    session?.rustdesk_id,
    session?.rustdesk_password,
    session?.rustdesk_platform,
  ])

  const agentOptions = [
    {
      key: 'windows',
      label: 'Windows',
      description: 'PC con Windows 64-bit',
      href: rustdesk.downloads.windows,
    },
    {
      key: 'macIntel',
      label: 'Mac Intel',
      description: 'Mac con procesador Intel',
      href: rustdesk.downloads.macIntel,
    },
    {
      key: 'macArm',
      label: 'Mac Apple Silicon',
      description: 'Mac M1/M2/M3/M4',
      href: rustdesk.downloads.macArm,
    },
    {
      key: 'linux',
      label: 'Linux',
      description: 'Ubuntu / Debian / Fedora y compatibles',
      href: rustdesk.downloads.linux,
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

  async function handlePublishRustDesk() {
    setSavingRustDesk(true)
    const success = await publishRustDeskConnection({
      rustdeskId: rustDeskIdInput,
      rustdeskPassword: rustDeskPasswordInput,
      platform: rustDeskPlatform || null,
    })

    if (success) {
      setCopyFeedback('Datos de conexión enviados al técnico.')
    }

    setSavingRustDesk(false)
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

      {(!rustdesk.idServer || !rustdesk.key) && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
          Configuración incompleta: definí <strong>VITE_RUSTDESK_ID_SERVER</strong> y{' '}
          <strong>VITE_RUSTDESK_KEY</strong>.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
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
            <h2 className="text-base font-semibold">Instalá y abrí RustDesk</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Descargá RustDesk, conectalo a este servidor y compartí tu ID para que el técnico te asista.
            </p>
          </div>

          {availableAgentOptions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Configuración del servidor RustDesk</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>
                ID Server: <strong className="text-foreground">{rustdesk.idServer || '—'}</strong>
              </p>
              <p>
                Relay Server:{' '}
                <strong className="text-foreground">{rustdesk.relayServer || '(auto)'}</strong>
              </p>
              <p>
                Key: <strong className="break-all text-foreground">{rustdesk.key || '—'}</strong>
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            <label className="space-y-1 text-left text-sm">
              <span className="text-xs text-muted-foreground">Tu ID de RustDesk</span>
              <input
                value={rustDeskIdInput}
                onChange={(event) => setRustDeskIdInput(event.target.value)}
                placeholder="Ej: 123 456 789"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-left text-sm">
              <span className="text-xs text-muted-foreground">Contraseña temporal (opcional)</span>
              <input
                value={rustDeskPasswordInput}
                onChange={(event) => setRustDeskPasswordInput(event.target.value)}
                placeholder="Si RustDesk te muestra una"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-left text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">Sistema operativo</span>
              <input
                value={rustDeskPlatform}
                onChange={(event) => setRustDeskPlatform(event.target.value)}
                placeholder="Windows / macOS / Linux"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <div className="md:col-span-2">
              <button
                onClick={handlePublishRustDesk}
                disabled={savingRustDesk || !rustDeskIdInput.trim()}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRustDesk ? 'Guardando…' : 'Enviar datos al técnico'}
              </button>
            </div>
          </div>

          {session.rustdesk_ready_at && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Check className="h-4 w-4" />
              Listo: el técnico ya puede iniciar la conexión con tu equipo.
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
          <p className="text-sm text-muted-foreground text-center">
            El usuario aceptó la sesión. Esperá a que comparta su ID de RustDesk o pedile que lo cargue desde este panel.
          </p>

          {session.rustdesk_id ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  ID remoto: <strong>{session.rustdesk_id}</strong>
                </p>
                <button
                  onClick={() => void copyToClipboard('ID de RustDesk', session.rustdesk_id)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar ID
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  Contraseña: <strong>{session.rustdesk_password || 'no informada'}</strong>
                </p>
                {session.rustdesk_password && (
                  <button
                    onClick={() => void copyToClipboard('contraseña de RustDesk', session.rustdesk_password)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-background"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar contraseña
                  </button>
                )}
              </div>

              {session.rustdesk_platform && (
                <p className="text-xs text-muted-foreground">Plataforma del usuario: {session.rustdesk_platform}</p>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
              Todavía no hay ID de RustDesk cargado.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {rustdesk.sessionWebClientUrl && (
              <a
                href={rustdesk.sessionWebClientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir cliente web RustDesk
              </a>
            )}

            {rustdesk.webClientUrl && !rustdesk.sessionWebClientUrl && (
              <a
                href={rustdesk.webClientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir RustDesk web
              </a>
            )}

            <button
              onClick={() => void startAsViewer()}
              disabled={!session.rustdesk_id}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Marcar sesión en curso
            </button>
          </div>
        </div>
      )}

      {isViewer && isActive && (
        <div className="space-y-4 rounded-lg border bg-card p-6 text-center">
          {rustdesk.sessionWebClientUrl ? (
            <a
              href={rustdesk.sessionWebClientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir conexión RustDesk
            </a>
          ) : rustdesk.webClientUrl ? (
            <a
              href={rustdesk.webClientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir RustDesk web
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Abrí tu cliente RustDesk local y conectate usando el ID del usuario.
            </p>
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
