/**
 * Detects the local LAN IP using WebRTC ICE candidates (STUN).
 * Returns the first host candidate IP, or null if detection fails or times out.
 */
export async function getLocalIp(): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000)

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      pc.createDataChannel('')

      pc.onicecandidate = (event) => {
        if (!event.candidate) return

        // host candidates carry the local LAN IP
        if (event.candidate.type === 'host') {
          const ip = event.candidate.address ?? null
          clearTimeout(timeout)
          pc.close()
          resolve(ip)
        }
      }

      void pc.createOffer().then((offer) => pc.setLocalDescription(offer))
    } catch {
      clearTimeout(timeout)
      resolve(null)
    }
  })
}
