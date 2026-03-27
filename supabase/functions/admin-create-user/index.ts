import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserPayload {
  action: 'create' | 'update-email'
  // create
  email?: string
  password?: string
  name?: string
  role?: string
  // update-email
  userId?: string
  newEmail?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2.2 Verify caller is admin-it
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Admin client with service role for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Verify the caller's JWT and get their user record
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) {
      return json({ error: 'Invalid or expired token' }, 401)
    }

    // Check caller role using service role client (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin-it') {
      return json({ error: 'Forbidden: admin-it role required' }, 403)
    }

    const payload: CreateUserPayload = await req.json()

    // 2.5 Update email action
    if (payload.action === 'update-email') {
      if (!payload.userId || !payload.newEmail) {
        return json({ error: 'userId and newEmail are required' }, 400)
      }

      const { error } = await adminClient.auth.admin.updateUserById(payload.userId, {
        email: payload.newEmail,
      })

      if (error) return json({ error: error.message }, 400)

      // Sync profiles table
      await adminClient
        .from('profiles')
        .update({ email: payload.newEmail })
        .eq('id', payload.userId)

      return json({ success: true })
    }

    // 2.3 Create user action
    if (payload.action === 'create') {
      const { email, password, name, role } = payload

      // 2.6 Validate inputs
      if (!email || !password || !name) {
        return json({ error: 'email, password and name are required' }, 400)
      }
      if (password.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400)
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (error) {
        // 2.6 Email duplicate
        if (error.message.toLowerCase().includes('already')) {
          return json({ error: 'Email already in use' }, 409)
        }
        return json({ error: error.message }, 400)
      }

      // 2.4 Update the auto-created profile with name and role
      await adminClient
        .from('profiles')
        .update({
          name,
          role: role ?? 'user',
        })
        .eq('id', data.user.id)

      return json({ userId: data.user.id })
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
