import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useRemoteSession } from './useRemoteSession'
import { SessionChat } from './SessionChat'
import { cn } from '@/lib/utils'

export default function RemoteSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)

  const { session, remoteStream, connectionState, error, startAsInitiator, endSession } =
    useRemoteSession(sessionId ?? null, profile?.id ?? null)

  // Render remote stream in <video> element (task 6.8)
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const isInitiator = session?.initiated_by === profile?.id

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sesión de asistencia remota</h1>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            connectionState === 'connected'
              ? 'bg-green-100 text-green-800'
              : connectionState === 'idle'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-yellow-100 text-yellow-700'
          )}
        >
          {connectionState}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* Remote video stream */}
      <div className="overflow-hidden rounded-lg border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full"
          style={{ minHeight: '320px' }}
        />
        {!remoteStream && (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-gray-400">Sin señal de vídeo todavía...</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isInitiator && session?.status === 'activa' && (
          <button
            onClick={startAsInitiator}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Compartir pantalla
          </button>
        )}
        {session?.status === 'activa' && (
          <button
            onClick={endSession}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
          >
            Finalizar sesión
          </button>
        )}
      </div>

      {session && profile && (
        <SessionChat
          sessionId={session.id}
          userId={profile.id}
          userName={profile.name}
        />
      )}
    </div>
  )
}
