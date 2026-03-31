import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link2, Monitor, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import { inferDeviceName } from '@/lib/inferDeviceName'
import type { Database } from '@/types'

type DeviceInvite = Database['public']['Tables']['device_invites']['Row']
type AcceptInviteResult = {
  device_id: string | null
  session_id: string | null
  already_consumed: boolean
}

function mapInviteAcceptanceError(message?: string, code?: string) {
  const normalized = (message ?? '').toLowerCase()

  if (normalized.includes('invite not found') || code === 'P0002') {
    return 'Este enlace no existe o ya no está disponible.'
  }

  if (normalized.includes('does not belong')) {
    return 'Este enlace pertenece a otra cuenta. Iniciá sesión con el usuario correcto.'
  }

  if (normalized.includes('has expired') || code === '22023') {
    return 'Este enlace venció. Pedile a soporte que te comparta uno nuevo.'
  }

  if (normalized.includes('already consumed')) {
    return 'Este enlace ya fue utilizado. Si necesitás ayuda otra vez, pedí uno nuevo.'
  }

  return 'No se pudo autorizar el equipo en este momento.'
}

function formatInviteState(invite: DeviceInvite | null, profileId?: string | null) {
  if (!invite) {
    return {
      title: 'Link de invitación inválido',
      description: 'Este link no existe o ya no está disponible.',
      actionable: false,
    }
  }

  if (invite.invited_user_id !== profileId) {
    return {
      title: 'Este link no es para tu cuenta',
      description: 'Iniciá sesión con el usuario correcto o pedile a soporte que te envíe uno nuevo.',
      actionable: false,
    }
  }

  if (invite.used_at) {
    return {
      title: 'Este link ya fue utilizado',
      description: 'Si necesitás asistencia otra vez, pedile a soporte que genere un link nuevo.',
      actionable: false,
    }
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      title: 'Este link ha caducado',
      description: 'Solicitá uno nuevo a tu soporte técnico.',
      actionable: false,
    }
  }

  return {
    title: 'Autorizá tu equipo para recibir asistencia',
    description: 'Vamos a registrar este ordenador en Control Issue y dejar lista la sesión remota.',
    actionable: true,
  }
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { loading, profile, session } = useAuth()
  const [invite, setInvite] = useState<DeviceInvite | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authorizing, setAuthorizing] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!session) {
      const redirect = encodeURIComponent(`/invite/${token}`)
      navigate(`/login?redirect=${redirect}&message=invite`, { replace: true })
    }
  }, [loading, navigate, session, token])

  useEffect(() => {
    if (!token || !session) return

    async function loadInvite(inviteToken: string) {
      setInviteLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('device_invites')
        .select('*')
        .eq('token', inviteToken)
        .maybeSingle()

      if (error) {
        setError(error.message)
      }

      setInvite(data ?? null)
      setInviteLoading(false)
    }

    void loadInvite(token)
  }, [session, token])

  const inviteState = useMemo(
    () => formatInviteState(invite, profile?.id ?? null),
    [invite, profile?.id]
  )

  async function handleAuthorize() {
    if (!profile || !token) return

    setAuthorizing(true)
    setError(null)

    const deviceName = inferDeviceName(profile.name)
    const { data, error: rpcError } = await supabase.rpc('accept_device_invite', {
      p_token: token,
      p_device_name: deviceName,
    })

    if (rpcError) {
      setError(mapInviteAcceptanceError(rpcError.message, rpcError.code))
      setAuthorizing(false)
      return
    }

    const result = (Array.isArray(data) ? data[0] : data) as AcceptInviteResult | null

    if (!result?.device_id) {
      setError('No se pudo completar la autorización del equipo.')
      setAuthorizing(false)
      return
    }

    navigate(result.session_id ? `/remote/${result.session_id}` : '/devices', {
      replace: true,
      state: result.session_id
        ? { inviteAuthorized: true }
        : {
            inviteAuthorized: true,
            inviteMessage: result.already_consumed
              ? 'Este equipo ya estaba autorizado previamente.'
              : 'Equipo registrado correctamente.',
          },
    })
  }

  if (loading || !session || (session && !profile) || inviteLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando…</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{inviteState.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{inviteState.description}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-start gap-3">
            <Monitor className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Qué va a pasar</p>
              <p className="text-muted-foreground">
                Al autorizar, registramos este ordenador en la app y te llevamos al flujo para dejar lista la
                asistencia remota con soporte.
              </p>
            </div>
          </div>
        </div>

        {invite && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">Invitación</p>
                <p className="text-muted-foreground">
                  Expira el {new Date(invite.expires_at).toLocaleString('es-ES')}.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleAuthorize}
            disabled={!inviteState.actionable || authorizing}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authorizing ? 'Autorizando…' : 'Autorizar este equipo'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}
