import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']
type RemoteSessionUpdate = Database['public']['Tables']['remote_sessions']['Update']

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice-candidate'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  from: string
}

type DisplaySurfacePreference = 'include' | 'exclude'

type BrowserDisplayMediaStreamOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean
  selfBrowserSurface?: DisplaySurfacePreference
  surfaceSwitching?: DisplaySurfacePreference
}

const TURN_URL = import.meta.env.VITE_TURN_URL
const CONNECTION_TIMEOUT_MS = 30_000
const OPEN_STATUSES: SessionStatus[] = ['pendiente', 'aceptada', 'activa']
const TERMINAL_STATUSES: SessionStatus[] = ['rechazada', 'fallida', 'finalizada', 'cancelada']

const STUN_ONLY: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
const DISPLAY_MEDIA_OPTIONS: BrowserDisplayMediaStreamOptions = {
  video: true,
  audio: false,
  preferCurrentTab: true,
  selfBrowserSurface: 'exclude',
  surfaceSwitching: 'include',
}

async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (!TURN_URL) return STUN_ONLY

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return STUN_ONLY

    const { data, error } = await supabase.functions.invoke('get-turn-credentials')
    if (error || !data?.urls) {
      console.warn('[TURN] Could not fetch credentials, falling back to STUN only:', error)
      return STUN_ONLY
    }

    return [
      ...STUN_ONLY,
      { urls: data.urls, username: data.username, credential: data.credential },
    ]
  } catch (err) {
    console.warn('[TURN] fetchIceServers failed, falling back to STUN only:', err)
    return STUN_ONLY
  }
}

function normalizeFailureReason(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Permiso de pantalla denegado por el usuario.'
    if (error.name === 'NotFoundError') return 'No se encontró una fuente de pantalla para compartir.'
    return error.message
  }

  if (error instanceof Error) return error.message

  return 'La sesión remota falló por un error inesperado.'
}

function isTerminalStatus(status?: SessionStatus | null): boolean {
  return !!status && TERMINAL_STATUSES.includes(status)
}

export function useRemoteSession(sessionId: string | null, userId: string | null) {
  const [session, setSession] = useState<RemoteSession | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sigChannelRef = useRef<RealtimeChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
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

      if (!updateError) {
        syncLocalSession(update)
      }
    },
    [sessionId, syncLocalSession]
  )

  const clearConnectionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const disposePeerConnection = useCallback(
    (stopLocalStream: boolean) => {
      clearConnectionTimeout()

      if (stopLocalStream) {
        localStreamRef.current?.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
      }

      pcRef.current?.close()
      pcRef.current = null
      setRemoteStream(null)
      setConnectionState('idle')
    },
    [clearConnectionTimeout]
  )

  const markFailure = useCallback(
    async (reason: string) => {
      setError(reason)
      disposePeerConnection(true)
      await updateSession({
        status: 'fallida',
        connection_phase: 'failed',
        failure_reason: reason,
        ended_at: new Date().toISOString(),
      })
    },
    [disposePeerConnection, updateSession]
  )

  const createPeerConnection = useCallback(
    (role: 'viewer' | 'sharer', iceServers: RTCIceServer[]) => {
      disposePeerConnection(false)

      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc
      setConnectionState('connecting')
      setError(null)

      pc.onconnectionstatechange = () => {
        const nextState = pc.connectionState
        setConnectionState(nextState)

        if (nextState === 'connected') {
          clearConnectionTimeout()
          void updateSession({
            status: 'activa',
            connection_phase: 'connected',
            started_at: sessionRef.current?.started_at ?? new Date().toISOString(),
            failure_reason: null,
          })
          return
        }

        if (nextState === 'failed' || nextState === 'disconnected') {
          if (!isTerminalStatus(sessionRef.current?.status as SessionStatus | undefined)) {
            void markFailure('La conexión remota se interrumpió antes de estabilizarse.')
          }
          return
        }

        if (nextState === 'closed') {
          void updateSession({ connection_phase: 'closing' })
        }
      }

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !sessionId || !userId) return
        sigChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'ice-candidate', candidate: candidate.toJSON(), from: userId },
        })
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams
        if (stream) setRemoteStream(stream)
      }

      timeoutRef.current = setTimeout(() => {
        if (pc.connectionState !== 'connected' && !isTerminalStatus(sessionRef.current?.status as SessionStatus | undefined)) {
          void markFailure('La conexión remota agotó el tiempo de espera (30s).')
        }
      }, CONNECTION_TIMEOUT_MS)

      if (role === 'viewer') {
        void updateSession({ connection_phase: 'signaling', failure_reason: null })
      }

      return pc
    },
    [clearConnectionTimeout, disposePeerConnection, markFailure, sessionId, updateSession, userId]
  )

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!sessionId || !userId) return

    const channel = supabase
      .channel(`webrtc:${sessionId}`)
      .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: SignalPayload }) => {
        if (payload.from === userId) return

        const pc = pcRef.current
        if (!pc || pc.connectionState === 'closed') return

        try {
          if (payload.type === 'offer' && payload.sdp) {
            await updateSession({ connection_phase: 'signaling' })
            // Re-check after the async Supabase call — PC could have been disposed meanwhile
            if (!pcRef.current || pcRef.current.connectionState === 'closed') return
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await sigChannelRef.current?.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'answer', sdp: answer, from: userId },
            })
            return
          }

          if (payload.type === 'answer' && payload.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            return
          }

          if (payload.type === 'ice-candidate' && payload.candidate) {
            // Trickle ICE: candidates may arrive before setRemoteDescription completes.
            // Swallow the error silently — this is non-fatal and expected.
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch {
              // ignored: candidate arrived before remote description was set
            }
          }
        } catch (signalError) {
          await markFailure(normalizeFailureReason(signalError))
        }
      })
      .subscribe()

    sigChannelRef.current = channel

    return () => {
      sigChannelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [markFailure, sessionId, updateSession, userId])

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
    if (!session || !isTerminalStatus(session.status as SessionStatus)) return
    disposePeerConnection(true)
  }, [disposePeerConnection, session?.id, session?.status])

  async function startAsSharer() {
    if (!sessionId || !userId) return

    setError(null)
    await updateSession({
      status: 'aceptada',
      accepted_at: sessionRef.current?.accepted_at ?? new Date().toISOString(),
      connection_phase: 'requesting-media',
      failure_reason: null,
      ended_at: null,
    })

    try {
      // Fetch TURN credentials and display media in parallel to minimize latency
      const [iceServers, stream] = await Promise.all([
        fetchIceServers(),
        navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS),
      ])

      const pc = createPeerConnection('sharer', iceServers)
      localStreamRef.current = stream

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          void endSession('finalizada')
        }
        pc.addTrack(track, stream)
      })

      await updateSession({ connection_phase: 'signaling' })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sigChannelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'offer', sdp: offer, from: userId },
      })
    } catch (startError) {
      await markFailure(normalizeFailureReason(startError))
    }
  }

  async function startAsViewer() {
    if (!sessionId || !userId || pcRef.current) return
    setError(null)
    const iceServers = await fetchIceServers()
    createPeerConnection('viewer', iceServers)
  }

  async function rejectSession() {
    disposePeerConnection(true)
    await updateSession({
      status: 'rechazada',
      connection_phase: 'idle',
      failure_reason: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function cancelSession() {
    disposePeerConnection(true)
    await updateSession({
      status: 'cancelada',
      connection_phase: 'closing',
      failure_reason: null,
      ended_at: new Date().toISOString(),
    })
  }

  async function endSession(finalStatus: SessionStatus = 'finalizada') {
    disposePeerConnection(true)
    await updateSession({
      status: finalStatus,
      connection_phase: 'closing',
      ended_at: new Date().toISOString(),
    })
  }

  return {
    session,
    remoteStream,
    connectionState,
    error,
    turnConfigured: Boolean(TURN_URL),
    startAsSharer,
    startAsViewer,
    rejectSession,
    cancelSession,
    endSession,
    isSessionOpen: OPEN_STATUSES.includes((session?.status ?? 'fallida') as SessionStatus),
  }
}
