import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type RemoteSessionUpdate = Database['public']['Tables']['remote_sessions']['Update']

const MESHCENTRAL_URL = import.meta.env.VITE_MESHCENTRAL_URL as string | undefined
const MESHCENTRAL_AGENT_DOWNLOAD_URL = import.meta.env.VITE_MESHCENTRAL_AGENT_DOWNLOAD_URL as
  | string
  | undefined
const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']

function toAbsoluteUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) return ''
  try {
    return new URL(path, baseUrl).toString()
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
    meshcentralAgentDownloadUrl:
      MESHCENTRAL_AGENT_DOWNLOAD_URL ?? toAbsoluteUrl(MESHCENTRAL_URL, '/meshagents?id=4'),
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
    isSessionOpen: OPEN_STATUSES.includes(session?.status ?? 'fallida'),
  }
}
