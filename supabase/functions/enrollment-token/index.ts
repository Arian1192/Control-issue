import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const encoder = new TextEncoder()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function authenticateDevice(
  supabaseAdmin: ReturnType<typeof createClient>,
  deviceId: string,
  agentToken: string
) {
  if (!deviceId || !agentToken) {
    return { error: jsonResponse({ error: 'device_id and agent_token required' }, 400) }
  }

  const agentTokenHash = await sha256Hex(agentToken)
  const { data: device, error } = await supabaseAdmin
    .from('devices')
    .select('id, rustdesk_id')
    .eq('id', deviceId)
    .eq('agent_token_hash', agentTokenHash)
    .maybeSingle()

  if (error || !device) {
    return { error: jsonResponse({ error: 'Invalid device credentials' }, 401) }
  }

  return { device }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  try {
    const body = await req.json() as Record<string, unknown>
    const action = body.action as string

    // --- generate: admin genera token para un device_id específico ---
    if (action === 'generate') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return jsonResponse({ error: 'Authorization required' }, 401)
      }

      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
      if (userError || !user) {
        return jsonResponse({ error: 'Invalid token' }, 401)
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (!profile?.is_active || !['admin-it', 'technician'].includes(profile.role as string)) {
        return jsonResponse({ error: 'Insufficient permissions' }, 403)
      }

      const deviceId = body.device_id as string
      if (!deviceId) {
        return jsonResponse({ error: 'device_id required' }, 400)
      }

      const token = crypto.randomUUID()

      const { error: updateError } = await supabaseAdmin
        .from('devices')
        .update({ enrollment_token: token })
        .eq('id', deviceId)

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500)
      }

      return jsonResponse({ token, device_id: deviceId })
    }

    // --- register: agente reporta rustdesk_id usando el token ---
    if (action === 'register') {
      const enrollmentToken = body.enrollment_token as string
      const rustdeskId = body.rustdesk_id as string

      if (!enrollmentToken || !rustdeskId) {
        return jsonResponse({ error: 'enrollment_token and rustdesk_id required' }, 400)
      }

      const { data: device, error: findError } = await supabaseAdmin
        .from('devices')
        .select('id')
        .eq('enrollment_token', enrollmentToken)
        .single()

      if (findError || !device) {
        return jsonResponse({ error: 'Invalid or expired enrollment token' }, 404)
      }

      const agentToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
      const agentTokenHash = await sha256Hex(agentToken)

      const { error: updateError } = await supabaseAdmin
        .from('devices')
        .update({
          rustdesk_id: rustdeskId,
          enrollment_token: null,
          agent_token_hash: agentTokenHash,
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', (device as { id: string }).id)

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500)
      }

      return jsonResponse({
        ok: true,
        device_id: (device as { id: string }).id,
        agent_token: agentToken,
      })
    }

    if (action === 'heartbeat') {
      const deviceId = body.device_id as string
      const agentToken = body.agent_token as string
      const auth = await authenticateDevice(supabaseAdmin, deviceId, agentToken)
      if (auth.error) return auth.error

      const { error: updateError } = await supabaseAdmin
        .from('devices')
        .update({
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', deviceId)

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500)
      }

      return jsonResponse({ ok: true })
    }

    if (action === 'pull-session') {
      const deviceId = body.device_id as string
      const agentToken = body.agent_token as string
      const auth = await authenticateDevice(supabaseAdmin, deviceId, agentToken)
      if (auth.error) return auth.error

      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from('remote_sessions')
        .select('id, otp, otp_expires_at')
        .eq('target_device_id', deviceId)
        .eq('status', 'aceptada')
        .order('accepted_at', { ascending: true })
        .limit(1)

      if (sessionError) {
        return jsonResponse({ error: sessionError.message }, 500)
      }

      const session = (sessions ?? []).find((candidate) => {
        if (!candidate.otp) return true
        if (!candidate.otp_expires_at) return true
        return new Date(candidate.otp_expires_at).getTime() <= Date.now()
      })

      return jsonResponse({
        session: session ? { id: session.id } : null,
      })
    }

    if (action === 'report-otp') {
      const deviceId = body.device_id as string
      const agentToken = body.agent_token as string
      const sessionId = body.session_id as string
      const otp = body.otp as string
      const otpExpiresAt = body.otp_expires_at as string

      const auth = await authenticateDevice(supabaseAdmin, deviceId, agentToken)
      if (auth.error) return auth.error

      if (!sessionId || !otp || !otpExpiresAt) {
        return jsonResponse({ error: 'session_id, otp and otp_expires_at required' }, 400)
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('remote_sessions')
        .update({
          otp,
          otp_expires_at: otpExpiresAt,
          connection_phase: 'ready-for-technician',
          rustdesk_ready_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('target_device_id', deviceId)
        .eq('status', 'aceptada')
        .select('id')
        .maybeSingle()

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500)
      }

      if (!updated) {
        return jsonResponse({ error: 'Session not found or no longer waiting for OTP' }, 404)
      }

      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
