import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database, SessionStatus } from '@/types'

type RemoteSession = Database['public']['Tables']['remote_sessions']['Row']

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice-candidate'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  from: string
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  // Add TURN server credentials via env vars when available:
  // {
  //   urls: import.meta.env.VITE_TURN_URL,
  //   username: import.meta.env.VITE_TURN_USERNAME,
  //   credential: import.meta.env.VITE_TURN_CREDENTIAL,
  // },
]

const CONNECTION_TIMEOUT_MS = 30_000

export function useRemoteSession(sessionId: string | null, userId: string | null) {
  const [session, setSession] = useState<RemoteSession | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateSessionStatus = useCallback(async (status: SessionStatus, extra?: Partial<RemoteSession>) => {
    if (!sessionId) return
    await supabase
      .from('remote_sessions')
      .update({ status, ...extra })
      .eq('id', sessionId)
  }, [sessionId])

  // Subscribe to signaling channel
  useEffect(() => {
    if (!sessionId || !userId) return

    const channel = supabase
      .channel(`webrtc:${sessionId}`)
      .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: SignalPayload }) => {
        if (payload.from === userId) return // ignore own signals
        const pc = pcRef.current
        if (!pc) return

        if (payload.type === 'offer' && payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'answer', sdp: answer, from: userId } })
        } else if (payload.type === 'answer' && payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        } else if (payload.type === 'ice-candidate' && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, userId])

  // Subscribe to session status changes
  useEffect(() => {
    if (!sessionId) return
    supabase
      .from('remote_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => { if (data) setSession(data) })

    const channel = supabase
      .channel(`session_status:${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'remote_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as RemoteSession))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  function createPeerConnection(onTrack?: (stream: MediaStream) => void) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState)
      if (pc.connectionState === 'connected') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        updateSessionStatus('fallida')
        setError('La conexión WebRTC falló o fue interrumpida.')
      }
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !sessionId || !userId) return
      supabase.channel(`webrtc:${sessionId}`).send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'ice-candidate', candidate: candidate.toJSON(), from: userId },
      })
    }

    if (onTrack) {
      pc.ontrack = (e) => {
        const [stream] = e.streams
        if (stream) { setRemoteStream(stream); onTrack(stream) }
      }
    }

    // Connection timeout (task 6.10)
    timeoutRef.current = setTimeout(() => {
      if (pc.connectionState !== 'connected') {
        pc.close()
        updateSessionStatus('fallida')
        setError('Tiempo de conexión agotado (30s). Inténtalo de nuevo.')
      }
    }, CONNECTION_TIMEOUT_MS)

    return pc
  }

  // Initiate as technician: get display media and send offer
  async function startAsInitiator() {
    if (!sessionId || !userId) return
    setError(null)

    const pc = createPeerConnection((stream) => setRemoteStream(stream))
    const sigChannel = supabase.channel(`webrtc:${sessionId}`)

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      stream.getTracks().forEach((t) => {
        pc.addTrack(t, stream)
        // Detect when user stops sharing (task 6.11)
        t.onended = () => {
          updateSessionStatus('finalizada', { ended_at: new Date().toISOString() })
          pc.close()
        }
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sigChannel.send({ type: 'broadcast', event: 'signal', payload: { type: 'offer', sdp: offer, from: userId } })
      await updateSessionStatus('activa', { started_at: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar la sesión remota.')
    }
  }

  async function endSession() {
    pcRef.current?.close()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await updateSessionStatus('finalizada', { ended_at: new Date().toISOString() })
    setRemoteStream(null)
    setConnectionState('idle')
  }

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { session, remoteStream, connectionState, error, startAsInitiator, endSession }
}
