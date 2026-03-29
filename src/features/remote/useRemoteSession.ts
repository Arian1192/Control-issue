import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type RemoteSessionUpdate = Database['public']['Tables']['remote_sessions']['Update']

type PublishRustDeskPayload = {
  rustdeskId: string
  rustdeskPassword?: string | null
  platform?: string | null
}

function getEnv(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim()
  return value ? value : undefined
}

const RUSTDESK_ID_SERVER = getEnv('VITE_RUSTDESK_ID_SERVER')
const RUSTDESK_RELAY_SERVER = getEnv('VITE_RUSTDESK_RELAY_SERVER')
const RUSTDESK_KEY = getEnv('VITE_RUSTDESK_KEY')
const RUSTDESK_WEB_CLIENT_URL = getEnv('VITE_RUSTDESK_WEB_CLIENT_URL')
const RUSTDESK_WEB_CLIENT_TEMPLATE = getEnv('VITE_RUSTDESK_WEB_CLIENT_TEMPLATE')
const RUSTDESK_DOWNLOAD_WINDOWS_URL = getEnv('VITE_RUSTDESK_DOWNLOAD_WINDOWS_URL')
const RUSTDESK_DOWNLOAD_MAC_INTEL_URL = getEnv('VITE_RUSTDESK_DOWNLOAD_MAC_INTEL_URL')
const RUSTDESK_DOWNLOAD_MAC_ARM_URL = getEnv('VITE_RUSTDESK_DOWNLOAD_MAC_ARM_URL')
const RUSTDESK_DOWNLOAD_LINUX_URL = getEnv('VITE_RUSTDESK_DOWNLOAD_LINUX_URL')

const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']

function buildWebClientSessionUrl(rustdeskId?: string | null, rustdeskPassword?: string | null) {
  if (!rustdeskId) return ''

  if (RUSTDESK_WEB_CLIENT_TEMPLATE) {
    return RUSTDESK_WEB_CLIENT_TEMPLATE
      .split('{id}')
      .join(encodeURIComponent(rustdeskId))
      .split('{password}')
      .join(encodeURIComponent(rustdeskPassword ?? ''))
  }

  return RUSTDESK_WEB_CLIENT_URL ?? ''
}

export function useRemoteSession(sessionId: string | null, userId: string | null) {
  const [session, setSession] = useState<RemoteSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<RemoteSession | null>(null)

  const syncLocalSession = useCallback((update: RemoteSessionUpdate) => {
    setSession((prev) => (prev ? { ...prev, ...update } : prev))
  }, [])

  const updateSession = useCallback(
    async (update: RemoteSessionUpdate) => {
      if (!sessionId) return false

      const { error: updateError } = await supabase
        .from('remote_sessions')
        .update(update)
        .eq('id', sessionId)

      if (updateError) {
        setError(updateError.message)
        return false
      }

      setError(null)
      syncLocalSession(update)
      return true
    },
    [sessionId, syncLocalSession]
  )

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!sessionId) return

    async function loadSession() {
      const id = sessionId
      if (!id) return
      const { data } = await supabase
        .from('remote_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (data) setSession(data)
    }

    void loadSession()

    const channel = supabase
      .channel(`session_status:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'remote_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as RemoteSession)
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  async function startAsSharer() {
    if (!sessionId || !userId) return
    setError(null)
    await updateSession({
      status: 'aceptada',
      accepted_at: sessionRef.current?.accepted_at ?? new Date().toISOString(),
      connection_phase: 'awaiting-agent',
      failure_reason: null,
      ended_at: null,
      rustdesk_id: null,
      rustdesk_password: null,
      rustdesk_ready_at: null,
      rustdesk_platform: null,
    })
  }

  async function publishRustDeskConnection(payload: PublishRustDeskPayload) {
    const rustdeskId = payload.rustdeskId.trim()
    if (!rustdeskId) {
      setError('Ingresá el ID de RustDesk antes de continuar.')
      return false
    }

    return updateSession({
      connection_phase: 'agent-ready',
      failure_reason: null,
      rustdesk_id: rustdeskId,
      rustdesk_password: payload.rustdeskPassword?.trim() || null,
      rustdesk_ready_at: new Date().toISOString(),
      rustdesk_platform: payload.platform ?? null,
    })
  }

  async function startAsViewer() {
    if (!sessionId || !userId) return
    if (session?.status !== 'aceptada') return

    if (!session?.rustdesk_id) {
      setError('Todavía no recibiste el ID de RustDesk del usuario.')
      return
    }

    setError(null)
    await updateSession({
      status: 'activa',
      started_at: sessionRef.current?.started_at ?? new Date().toISOString(),
      connection_phase: 'connected',
      failure_reason: null,
    })
  }

  async function rejectSession() {
    await updateSession({
      status: 'rechazada',
      connection_phase: 'idle',
      failure_reason: null,
      rustdesk_password: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function cancelSession() {
    await updateSession({
      status: 'cancelada',
      connection_phase: 'closing',
      failure_reason: null,
      rustdesk_password: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function endSession(finalStatus: SessionStatus = 'finalizada') {
    await updateSession({
      status: finalStatus,
      connection_phase: 'closing',
      rustdesk_password: null,
      ended_at: new Date().toISOString(),
    })
  }

  return {
    session,
    error,
    rustdesk: {
      idServer: RUSTDESK_ID_SERVER ?? '',
      relayServer: RUSTDESK_RELAY_SERVER ?? '',
      key: RUSTDESK_KEY ?? '',
      webClientUrl: RUSTDESK_WEB_CLIENT_URL ?? '',
      webClientTemplate: RUSTDESK_WEB_CLIENT_TEMPLATE ?? '',
      downloads: {
        windows: RUSTDESK_DOWNLOAD_WINDOWS_URL ?? '',
        macIntel: RUSTDESK_DOWNLOAD_MAC_INTEL_URL ?? '',
        macArm: RUSTDESK_DOWNLOAD_MAC_ARM_URL ?? '',
        linux: RUSTDESK_DOWNLOAD_LINUX_URL ?? '',
      },
      sessionWebClientUrl: buildWebClientSessionUrl(session?.rustdesk_id, session?.rustdesk_password),
    },
    startAsSharer,
    publishRustDeskConnection,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
    isSessionOpen: OPEN_STATUSES.includes(session?.status ?? 'fallida'),
  }
}
