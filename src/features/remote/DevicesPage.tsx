import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Monitor, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'

type DeviceRow = Database['public']['Tables']['devices']['Row']
type Device = Pick<
  DeviceRow,
  'id' | 'name' | 'owner_id' | 'is_online' | 'last_seen' | 'ip_local' | 'created_at' | 'rustdesk_id'
>

const DEVICE_SELECT_FIELDS = 'id, name, owner_id, is_online, last_seen, ip_local, created_at, rustdesk_id'

export default function DevicesPage() {
  const { profile } = useAuth()
  const location = useLocation()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const inviteMessage = (location.state as { inviteMessage?: string } | null)?.inviteMessage

  useEffect(() => {
    if (!profile) return
    supabase
      .from('devices')
      .select(DEVICE_SELECT_FIELDS)
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDevices((data as Device[] | null) ?? [])
        setLoading(false)
      })

    // Heartbeat every 30s to mark this browser session's device online (task 6.2)
    // In a real scenario this would be a registered device with a known ID.
    // This placeholder pings and the device owner would have a registered device.
    const interval = setInterval(async () => {
      // Update last_seen for all owned devices that are online
      await supabase
        .from('devices')
        .update({ last_seen: new Date().toISOString(), is_online: true })
        .eq('owner_id', profile.id)
    }, 30_000)

    return () => clearInterval(interval)
  }, [profile])

  async function addDevice() {
    if (!newName.trim() || !profile) return
    setAdding(true)
    const { data } = await supabase
      .from('devices')
      .insert({ name: newName.trim(), owner_id: profile.id, is_online: false })
      .select(DEVICE_SELECT_FIELDS)
      .single()
    if (data) {
      setDevices((prev) =>
        [data, ...prev].sort((left, right) => right.created_at.localeCompare(left.created_at))
      )
    }
    setNewName('')
    setAdding(false)
  }

  const sortedDevices = useMemo(
    () => [...devices].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [devices]
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mis dispositivos</h1>
      <p className="text-sm text-muted-foreground">
        Cada dispositivo puede quedar listo para asistencia remota automática cuando soporte instale el agente de
        enrollment. Si todavía figura “Sin agente”, pedile a IT que ejecute la instalación una sola vez.
      </p>

      {inviteMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {inviteMessage}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del dispositivo (ej. PC-Oficina-01)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={addDevice}
          disabled={adding || !newName.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {adding ? 'Añadiendo...' : 'Añadir'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : sortedDevices.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Monitor className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Sin dispositivos registrados.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedDevices.map((device) => (
            <div key={device.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{device.name}</p>
                  {device.ip_local && <p className="text-xs text-muted-foreground">{device.ip_local}</p>}
                </div>
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                    device.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {device.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {device.is_online ? 'En línea' : 'Offline'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    device.rustdesk_id ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-900'
                  )}
                >
                  {device.rustdesk_id ? 'Agente listo' : 'Sin agente'}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Registrado el {new Date(device.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>

              {device.rustdesk_id && (
                <p className="text-xs text-muted-foreground">
                  RustDesk ID: <strong className="text-foreground">{device.rustdesk_id}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
