import { useEffect, useState } from 'react'
import { UserPlus, Pencil, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import { UserFormModal } from './UserFormModal'
import type { Database, Role } from '@/types'
import { cn } from '@/lib/utils'

type Profile = Database['public']['Tables']['profiles']['Row']

const ROLE_COLORS: Record<Role, string> = {
  'admin-it': 'bg-purple-100 text-purple-800',
  technician: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-700',
}

export default function UserManagementPage() {
  const { profile: currentUser } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('')
  // Modal
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: Profile } | null>(null)

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true })
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  async function toggleActive(user: Profile) {
    if (user.id === currentUser?.id) return // prevent self-deactivation
    await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)
    loadProfiles()
  }

  // Client-side filtering (4.3 + 4.4)
  const filtered = profiles.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || p.role === roleFilter
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'active' ? p.is_active : !p.is_active)
    return matchSearch && matchRole && matchStatus
  })

  return (
    <div className="space-y-4">
      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          onSuccess={() => { setModal(null); loadProfiles() }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gestión de usuarios</h2>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Filters (4.3 + 4.4) */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="admin-it">admin-it</option>
          <option value="technician">technician</option>
          <option value="user">user</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {/* 4.5 Role badge */}
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', ROLE_COLORS[u.role as Role])}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {/* 4.5 Active badge */}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        u.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* 6.3 Edit button */}
                      <button
                        onClick={() => setModal({ mode: 'edit', user: u })}
                        title="Editar"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* 6.3 Toggle active — disabled for self */}
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Desactivar' : 'Activar'}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {u.is_active ? (
                            <UserX className="h-4 w-4 text-red-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
