import { supabase } from './supabaseClient'
import type { Role } from '@/types'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No active session')
  return `Bearer ${token}`
}

function baseHeaders(authHeader: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: authHeader,
    apikey: ANON_KEY,
  }
}

export async function callAdminCreateUser(payload: {
  email: string
  password: string
  name: string
  role: Role
}): Promise<{ userId?: string; error?: string }> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: baseHeaders(await getAuthHeader()),
      body: JSON.stringify({ action: 'create', ...payload }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Unknown error' }
    return { userId: data.userId }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function callAdminUpdateEmail(
  userId: string,
  newEmail: string
): Promise<{ error?: string }> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: baseHeaders(await getAuthHeader()),
      body: JSON.stringify({ action: 'update-email', userId, newEmail }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Unknown error' }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
}
