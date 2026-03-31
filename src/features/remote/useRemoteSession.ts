import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type DeviceRow = Database['public']['Tables']['devices']['Row']
type Device = Pick<
  DeviceRow,
  'id' | 'name' | 'owner_id' | 'is_online' | 'last_seen' | 'ip_local' | 'created_at' | 'rustdesk_id'
>
type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type RemoteSessionUpdate = Database['public']['Tables']['remote_sessions']['Update']

const DEVICE_SELECT_FIELDS = 'id, name, owner_id, is_online, last_seen, ip_local, created_at, rustdesk_id'

function getEnv(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim()
  return value ? value : undefined
}

const RUSTDESK_ID_SERVER = getEnv('VITE_RUSTDESK_ID_SERVER')
const RUSTDESK_RELAY_SERVER = getEnv('VITE_RUSTDESK_RELAY_SERVER')
const RUSTDESK_KEY = getEnv('VITE_RUSTDESK_KEY')
const RUSTDESK_WEB_CLIENT_ENABLED = getEnv('VITE_RUSTDESK_WEB_CLIENT_ENABLED') === 'true'
const RUSTDESK_WEB_CLIENT_URL = getEnv('VITE_RUSTDESK_WEB_CLIENT_URL')
const RUSTDESK_WEB_CLIENT_TEMPLATE = getEnv('VITE_RUSTDESK_WEB_CLIENT_TEMPLATE')
const RUSTDESK_FORCE_PUBLIC_FALLBACK =
  getEnv('VITE_RUSTDESK_FORCE_PUBLIC_FALLBACK') === 'true' || RUSTDESK_ID_SERVER === 'rd.ariancoro.com'

const EFFECTIVE_ID_SERVER = RUSTDESK_FORCE_PUBLIC_FALLBACK ? undefined : RUSTDESK_ID_SERVER
const EFFECTIVE_RELAY_SERVER = RUSTDESK_FORCE_PUBLIC_FALLBACK ? undefined : RUSTDESK_RELAY_SERVER
const EFFECTIVE_KEY = RUSTDESK_FORCE_PUBLIC_FALLBACK ? undefined : RUSTDESK_KEY

const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']

function buildWebClientSessionUrl(rustdeskId?: string | null, otp?: string | null) {
  if (!RUSTDESK_WEB_CLIENT_ENABLED) return ''
  if (RUSTDESK_FORCE_PUBLIC_FALLBACK) return ''
  if (!rustdeskId) return ''

  if (RUSTDESK_WEB_CLIENT_TEMPLATE) {
    return RUSTDESK_WEB_CLIENT_TEMPLATE
      .split('{id}')
      .join(encodeURIComponent(rustdeskId))
      .split('{password}')
      .join(encodeURIComponent(otp ?? ''))
  }

  return RUSTDESK_WEB_CLIENT_URL ?? ''
}

function buildNativeConnectionSummary(rustdeskId?: string | null, otp?: string | null) {
  if (!rustdeskId) return ''

  const lines = [`ID remoto: ${rustdeskId}`]
  if (otp?.trim()) {
    lines.push(`OTP temporal: ${otp.trim()}`)
  }

  if (RUSTDESK_FORCE_PUBLIC_FALLBACK) {
    lines.push('Servidor: red pública oficial de RustDesk')
    return lines.join('\n')
  }

  if (EFFECTIVE_ID_SERVER) {
    lines.push(`ID Server: ${EFFECTIVE_ID_SERVER}`)
  }

  if (EFFECTIVE_RELAY_SERVER) {
    lines.push(`Relay Server: ${EFFECTIVE_RELAY_SERVER}`)
  }

  if (EFFECTIVE_KEY) {
    lines.push(`Key: ${EFFECTIVE_KEY}`)
  }

  return lines.join('\n')
}

export function useRemoteSession(sessionId: string | null, userId: string | null) {
  const [device, setDevice] = useState<Device | null>(null)
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

  const loadDevice = useCallback(async (deviceId: string) => {
    const { data, error: loadError } = await supabase
      .from('devices')
      .select(DEVICE_SELECT_FIELDS)
      .eq('id', deviceId)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
      return
    }

    setDevice((data as Device | null) ?? null)
  }, [])

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

  useEffect(() => {
    if (!session?.target_device_id) {
      setDevice(null)
      return
    }

    void loadDevice(session.target_device_id)

    const channel = supabase
      .channel(`remote_device:${session.target_device_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices', filter: `id=eq.${session.target_device_id}` },
        (payload) => setDevice(payload.new as Device)
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadDevice, session?.target_device_id])

  async function startAsSharer() {
    if (!sessionId || !userId) return
    setError(null)
    await updateSession({
      status: 'aceptada',
      accepted_at: sessionRef.current?.accepted_at ?? new Date().toISOString(),
      connection_phase: device?.rustdesk_id ? 'awaiting-otp' : 'awaiting-rustdesk-install',
      failure_reason: null,
      ended_at: null,
      otp: null,
      otp_expires_at: null,
      rustdesk_password: null,
      rustdesk_ready_at: null,
    })
  }

  async function startAsViewer() {
    if (!sessionId || !userId) return
    if (session?.status !== 'aceptada') return

    if (!device?.rustdesk_id) {
      setError('Este dispositivo todavía no tiene el agente instalado ni un ID de RustDesk registrado.')
      return
    }

    if (!session?.otp) {
      setError('Todavía no recibiste el OTP automático del agente.')
      return
    }

    setError(null)
    await updateSession({
      status: 'activa',
      started_at: sessionRef.current?.started_at ?? new Date().toISOString(),
      connection_phase: 'active',
      failure_reason: null,
    })
  }

  async function rejectSession() {
    await updateSession({
      status: 'rechazada',
      connection_phase: 'closing',
      failure_reason: null,
      otp: null,
      otp_expires_at: null,
      rustdesk_password: null,
      rustdesk_ready_at: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function cancelSession() {
    await updateSession({
      status: 'cancelada',
      connection_phase: 'closing',
      failure_reason: null,
      otp: null,
      otp_expires_at: null,
      rustdesk_password: null,
      rustdesk_ready_at: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function endSession(finalStatus: SessionStatus = 'finalizada') {
    await updateSession({
      status: finalStatus,
      connection_phase: 'closing',
      otp: null,
      otp_expires_at: null,
      rustdesk_password: null,
      rustdesk_ready_at: null,
      ended_at: new Date().toISOString(),
    })
  }

  return {
    device,
    session,
    error,
    rustdesk: {
      idServer: EFFECTIVE_ID_SERVER ?? '',
      relayServer: EFFECTIVE_RELAY_SERVER ?? '',
      key: EFFECTIVE_KEY ?? '',
      usingPublicNetwork:
        RUSTDESK_FORCE_PUBLIC_FALLBACK || (!EFFECTIVE_ID_SERVER && !EFFECTIVE_RELAY_SERVER && !EFFECTIVE_KEY),
      webClientEnabled: RUSTDESK_WEB_CLIENT_ENABLED,
      webClientUrl: RUSTDESK_WEB_CLIENT_ENABLED ? (RUSTDESK_WEB_CLIENT_URL ?? '') : '',
      webClientTemplate: RUSTDESK_WEB_CLIENT_TEMPLATE ?? '',
      sessionWebClientUrl: buildWebClientSessionUrl(device?.rustdesk_id, session?.otp),
      nativeSessionSummary: buildNativeConnectionSummary(device?.rustdesk_id, session?.otp),
    },
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
    isSessionOpen: OPEN_STATUSES.includes(session?.status ?? 'fallida'),
  }
}
