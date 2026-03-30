import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Monitor, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types'
import { cn } from '@/lib/utils'

type Device = Database['public']['Tables']['devices']['Row']

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
      .select('*')
      .eq('owner_id', profile.id)
      .then(({ data }) => {
        setDevices(data ?? [])
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
      .select()
      .single()
    if (data) setDevices((prev) => [...prev, data])
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mis dispositivos</h1>

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
      ) : devices.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Monitor className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Sin dispositivos registrados.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium text-sm">{device.name}</p>
                {device.ip_local && (
                  <p className="text-xs text-muted-foreground">{device.ip_local}</p>
                )}
              </div>
              <span
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                  device.is_online
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {device.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {device.is_online ? 'En línea' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
