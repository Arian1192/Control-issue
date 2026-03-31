# enroll-windows.ps1 — Instala RustDesk + agente Control Issue en Windows
# Uso: .\enroll-windows.ps1 -DeviceId <ID> -EnrollmentToken <TOKEN> -SupabaseUrl <URL> -SupabaseAnonKey <KEY>
param(
    [Parameter(Mandatory=$true)][string]$DeviceId,
    [Parameter(Mandatory=$true)][string]$EnrollmentToken,
    [Parameter(Mandatory=$true)][string]$SupabaseUrl,
    [Parameter(Mandatory=$true)][string]$SupabaseAnonKey
)

$ErrorActionPreference = "Stop"

$InstallDir = "C:\Program Files\Control Issue Agent"
$ConfigDir  = "C:\ProgramData\control-issue-agent"
$AgentExe   = "$InstallDir\control-issue-agent.exe"
$ConfigFile = "$ConfigDir\config.toml"

Write-Host "==> Instalando RustDesk..." -ForegroundColor Cyan
$RustDeskUrl = "https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-windows-x86_64.exe"
$TmpInstaller = "$env:TEMP\rustdesk-installer.exe"
Invoke-WebRequest -Uri $RustDeskUrl -OutFile $TmpInstaller
Start-Process -FilePath $TmpInstaller -ArgumentList "/silent" -Wait
Remove-Item $TmpInstaller -Force

# Configurar RustDesk con servidor privado
$RustDeskAppData = "$env:APPDATA\RustDesk\config"
New-Item -ItemType Directory -Path $RustDeskAppData -Force | Out-Null
$RustDeskConfig = @"
rendezvous_server = 'rustdesk.ariancoro.com'
nat_type = 0
serial = 0
"@
Set-Content -Path "$RustDeskAppData\RustDesk.toml" -Value $RustDeskConfig

# Arrancar RustDesk brevemente para generar el ID
Write-Host "==> Inicializando RustDesk para generar ID..." -ForegroundColor Cyan
$RustDeskExe = "C:\Program Files\RustDesk\rustdesk.exe"
if (Test-Path $RustDeskExe) {
    Start-Process $RustDeskExe -WindowStyle Hidden
    Start-Sleep 5
    Stop-Process -Name "rustdesk" -Force -ErrorAction SilentlyContinue
}

Write-Host "==> Instalando agente Control Issue..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

$AgentUrl = "https://github.com/Arian1192/Control-issue/releases/latest/download/control-issue-agent-windows-amd64.exe"
Invoke-WebRequest -Uri $AgentUrl -OutFile $AgentExe

# Crear configuración del agente
$Config = @"
device_id = "$DeviceId"
enrollment_token = "$EnrollmentToken"
supabase_url = "$SupabaseUrl"
supabase_anon_key = "$SupabaseAnonKey"
"@
Set-Content -Path $ConfigFile -Value $Config

# Registrar servicio de Windows
sc.exe create "ControlIssueAgent" `
    binPath= "`"$AgentExe`" --config `"$ConfigFile`"" `
    start= auto `
    DisplayName= "Control Issue Agent"

sc.exe description "ControlIssueAgent" "Agente de asistencia remota Control Issue"
sc.exe start "ControlIssueAgent"

Write-Host "==> Enrollment completado. El agente registrará el ID de RustDesk al arrancar." -ForegroundColor Green
