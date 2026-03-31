import { supabase } from './supabaseClient'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrollment-token`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SCRIPT_BASE_URL = 'https://raw.githubusercontent.com/Arian1192/Control-issue/master/scripts'

type EnrollmentGenerateResponse = {
  token?: string
  device_id?: string
  error?: string
}

export type EnrollmentCommandBundle = {
  macScriptUrl: string
  windowsScriptUrl: string
  macCommand: string
  windowsCommand: string
}

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

function escapeShellArg(value: string) {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`
}

function escapePowerShellArg(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

export async function callEnrollmentTokenGenerate(
  deviceId: string
): Promise<{ token?: string; error?: string }> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: baseHeaders(await getAuthHeader()),
      body: JSON.stringify({ action: 'generate', device_id: deviceId }),
    })

    const data = (await res.json()) as EnrollmentGenerateResponse
    if (!res.ok) {
      return { error: data.error ?? 'No se pudo generar el token de enrollment.' }
    }

    return { token: data.token }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
}

export function buildEnrollmentCommands(deviceId: string, token: string): EnrollmentCommandBundle {
  const macScriptUrl = `${SCRIPT_BASE_URL}/enroll-mac.sh`
  const windowsScriptUrl = `${SCRIPT_BASE_URL}/enroll-windows.ps1`

  return {
    macScriptUrl,
    windowsScriptUrl,
    macCommand: [
      `curl -fsSL ${escapeShellArg(macScriptUrl)} | sudo bash -s --`,
      escapeShellArg(deviceId),
      escapeShellArg(token),
      escapeShellArg(import.meta.env.VITE_SUPABASE_URL as string),
      escapeShellArg(ANON_KEY),
    ].join(' '),
    windowsCommand: [
      `powershell -ExecutionPolicy Bypass -Command`,
      escapePowerShellArg(
        [
          `$script = "$env:TEMP\\enroll-windows.ps1"`,
          `Invoke-WebRequest -Uri ${escapePowerShellArg(windowsScriptUrl)} -OutFile $script`,
          `& $script -DeviceId ${escapePowerShellArg(deviceId)} -EnrollmentToken ${escapePowerShellArg(
            token
          )} -SupabaseUrl ${escapePowerShellArg(
            import.meta.env.VITE_SUPABASE_URL as string
          )} -SupabaseAnonKey ${escapePowerShellArg(ANON_KEY)}`,
        ].join('; ')
      ),
    ].join(' '),
  }
}
