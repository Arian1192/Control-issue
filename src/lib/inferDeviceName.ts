function detectPlatformLabel(userAgent: string, platform: string) {
  const normalizedUA = userAgent.toLowerCase()
  const normalizedPlatform = platform.toLowerCase()

  if (normalizedPlatform.includes('win') || normalizedUA.includes('windows')) return 'Windows'
  if (normalizedPlatform.includes('mac') || normalizedUA.includes('mac os x')) return 'Mac'
  if (normalizedPlatform.includes('linux') || normalizedUA.includes('linux')) return 'Linux'

  return 'Equipo'
}

export function inferDeviceName(profileName?: string | null) {
  if (typeof window === 'undefined') {
    return profileName?.trim() ? `Equipo de ${profileName.trim()}` : 'Mi equipo'
  }

  const rawName = profileName?.trim()
  const firstName = rawName?.split(/\s+/)[0]
  const owner = firstName || 'usuario'
  const platform = detectPlatformLabel(navigator.userAgent ?? '', navigator.platform ?? '')

  if (platform === 'Equipo') {
    return `Equipo de ${owner}`
  }

  return `${platform} de ${owner}`
}
