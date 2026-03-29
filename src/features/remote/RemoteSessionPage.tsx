import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useRemoteSession } from './useRemoteSession'
import { SessionChat } from './SessionChat'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

export default function RemoteSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [targetDeviceOwnerId, setTargetDeviceOwnerId] = useState<string | null>(null)
  const [targetDeviceName, setTargetDeviceName] = useState<string | null>(null)

  const {
    session,
    remoteStream,
    connectionState,
    error,
    startAsSharer,
    startAsViewer,
    endSession,
    isSessionOpen,
  } = useRemoteSession(sessionId ?? null, profile?.id ?? null)

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    const targetDeviceId = session?.target_device_id ?? null

    if (!targetDeviceId) {
      setTargetDeviceOwnerId(null)
      setTargetDeviceName(null)
      return
    }

    let ignore = false

    async function loadTargetDevice() {
      if (!targetDeviceId) return

      const { data } = await supabase
        .from('devices')
        .select('owner_id, name')
        .eq('id', targetDeviceId)
        .single()

      if (ignore) return

      setTargetDeviceOwnerId(data?.owner_id ?? null)
      setTargetDeviceName(data?.name ?? null)
    }

    void loadTargetDevice()

    return () => {
      ignore = true
    }
  }, [session?.target_device_id])

  const isInitiator = session?.initiated_by === profile?.id
  const isDeviceOwner = Boolean(profile?.id && targetDeviceOwnerId && profile.id === targetDeviceOwnerId)
  const canShareScreen = Boolean(
    profile?.id && session && (targetDeviceOwnerId ? isDeviceOwner : profile.id !== session.initiated_by)
  )

  useEffect(() => {
    if (!isInitiator || !isSessionOpen || connectionState !== 'idle') return
    void startAsViewer()
  }, [connectionState, isInitiator, isSessionOpen, startAsViewer])

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

      {session && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {canShareScreen ? (
            <p>
              Cuando empieces, tu navegador te va a dejar elegir qué pestaña, ventana o pantalla
              compartir{targetDeviceName ? ` desde ${targetDeviceName}` : ''}.
            </p>
          ) : isInitiator ? (
            <p>Esperando que la persona atendida elija qué compartir desde su equipo.</p>
          ) : (
            <p>Esperando información de la sesión remota…</p>
          )}
        </div>
      )}

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
        {canShareScreen && isSessionOpen && (
          <button
            onClick={() => void startAsSharer()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Elegir pantalla, ventana o pestaña
          </button>
        )}
        {isSessionOpen && (
          <button
            onClick={() => void endSession()}
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
