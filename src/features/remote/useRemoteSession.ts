import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type RemoteSessionUpdate = Database['public']['Tables']['remote_sessions']['Update']

function getEnv(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim()
  return value ? value : undefined
}

const MESHCENTRAL_URL = getEnv('VITE_MESHCENTRAL_URL')
const MESHCENTRAL_AGENT_DOWNLOAD_URL = getEnv('VITE_MESHCENTRAL_AGENT_DOWNLOAD_URL')
const MESHCENTRAL_AGENT_WINDOWS_URL = getEnv('VITE_MESHCENTRAL_AGENT_WINDOWS_URL')
const MESHCENTRAL_AGENT_MAC_INTEL_URL = getEnv('VITE_MESHCENTRAL_AGENT_MAC_INTEL_URL')
const MESHCENTRAL_AGENT_MAC_ARM_URL = getEnv('VITE_MESHCENTRAL_AGENT_MAC_ARM_URL')
const MESHCENTRAL_AGENT_INVITE_URL = getEnv('VITE_MESHCENTRAL_AGENT_INVITE_URL')
const MESHCENTRAL_MESH_ID = getEnv('VITE_MESHCENTRAL_MESH_ID')
const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']

function toAbsoluteUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) return ''
  try {
    return new URL(path, baseUrl).toString()
  } catch {
    return ''
  }
}

function buildProvisionedAgentUrl(path: string, agentId: number) {
  if (!MESHCENTRAL_MESH_ID) return ''
  const base = toAbsoluteUrl(MESHCENTRAL_URL, path)
  if (!base) return ''

  try {
    const url = new URL(base)
    url.searchParams.set('id', String(agentId))
    url.searchParams.set('meshid', MESHCENTRAL_MESH_ID)
    return url.toString()
  } catch {
    return ''
  }
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
      if (!sessionId) return
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
      connection_phase: 'signaling',
      failure_reason: null,
      ended_at: null,
    })
  }

  async function startAsViewer() {
    if (!sessionId || !userId) return
    if (session?.status !== 'aceptada') return
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
      ended_at: new Date().toISOString(),
    })
  }

  async function cancelSession() {
    await updateSession({
      status: 'cancelada',
      connection_phase: 'closing',
      failure_reason: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function endSession(finalStatus: SessionStatus = 'finalizada') {
    await updateSession({
      status: finalStatus,
      connection_phase: 'closing',
      ended_at: new Date().toISOString(),
    })
  }

  return {
    session,
    error,
    meshcentralUrl: MESHCENTRAL_URL ?? '',
    meshcentralAgentInviteUrl: MESHCENTRAL_AGENT_INVITE_URL ?? '',
    meshcentralAgentDownloads: {
      windows:
        MESHCENTRAL_AGENT_WINDOWS_URL ??
        MESHCENTRAL_AGENT_DOWNLOAD_URL ??
        buildProvisionedAgentUrl('/meshagents', 4),
      macIntel:
        MESHCENTRAL_AGENT_MAC_INTEL_URL ??
        buildProvisionedAgentUrl('/meshosxagent', 16),
      macArm:
        MESHCENTRAL_AGENT_MAC_ARM_URL ??
        buildProvisionedAgentUrl('/meshosxagent', 29),
    },
    meshcentralAgentDownloadUrl:
      MESHCENTRAL_AGENT_DOWNLOAD_URL ?? buildProvisionedAgentUrl('/meshagents', 4),
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
    isSessionOpen: OPEN_STATUSES.includes(session?.status ?? 'fallida'),
  }
}
