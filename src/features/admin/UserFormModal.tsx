import { useState, type FormEvent } from 'react'
import type { Database, Role } from '@/types'
import { supabase } from '@/lib/supabaseClient'
import { callAdminCreateUser, callAdminUpdateEmail } from '@/lib/edgeFunctions'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserFormModalProps {
  mode: 'create' | 'edit'
  user?: Profile
  onSuccess: () => void
  onClose: () => void
}

const inputClass = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
)

const ROLES: Role[] = ['user', 'technician', 'admin-it']

export function UserFormModal({ mode, user, onSuccess, onClose }: UserFormModalProps) {
  const { profile: currentUser } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>((user?.role as Role | undefined) ?? 'user')
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 5.3 Validation
  function validate(): string | null {
    if (!name.trim()) return 'El nombre es obligatorio.'
    if (!email.trim() || !email.includes('@')) return 'El email no es válido.'
    if (mode === 'create' && password.length < 8)
      return 'La contraseña debe tener al menos 8 caracteres.'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) { setError(validationError); return }

    // 5.6 Prevent admin from deactivating themselves
    if (mode === 'edit' && user?.id === currentUser?.id && !isActive) {
      setError('No puedes desactivar tu propia cuenta.')
      return
    }

    setLoading(true)

    if (mode === 'create') {
      // 5.4 Call Edge Function
      const { error: createError } = await callAdminCreateUser({ email, password, name, role })
      if (createError) { setError(createError); setLoading(false); return }
    } else if (mode === 'edit' && user) {
      // 5.5 Update profile fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name, role, is_active: isActive })
        .eq('id', user.id)

      if (updateError) { setError(updateError.message); setLoading(false); return }

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await callAdminUpdateEmail(user.id, email)
        if (emailError) { setError(emailError); setLoading(false); return }
      }
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nombre <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className={inputClass}
            />
          </div>

          {/* Password (create only) */}
          {mode === 'create' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Contraseña <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Active toggle (edit only) */}
          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <input
                id="is-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="is-active" className="text-sm font-medium">
                Usuario activo
              </label>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Guardando...' : mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
