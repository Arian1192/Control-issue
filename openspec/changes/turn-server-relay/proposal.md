## Why

La asistencia remota funciona únicamente en red local porque la `RTCPeerConnection` se configura solo con STUN. Cuando técnico y usuario están en redes distintas (4G, hogar con CGNAT, VPN) el traversal NAT falla silenciosamente y la sesión queda en `fallida`. El VPS propio con Coolify permite hostear Coturn sin coste variable y con control total.

## What Changes

- Desplegar `coturn/coturn` como servicio Docker en el VPS via Coolify, con soporte TURN/STUN en UDP y TURN sobre TLS
- Añadir Edge Function `get-turn-credentials` que genera credenciales efímeras (1 hora) usando HMAC-SHA1 sobre el secret compartido de Coturn — las credenciales permanentes nunca llegan al cliente
- Actualizar `useRemoteSession.ts` para obtener credenciales de la Edge Function e incluirlas como ICE servers antes de crear la `RTCPeerConnection`
- Eliminar el uso directo de `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` como credenciales estáticas en el cliente

## Capabilities

### New Capabilities

- `turn-credentials`: Generación segura de credenciales TURN efímeras desde el servidor. La Edge Function recibe el JWT del usuario autenticado, valida su sesión activa y devuelve un par `username`/`credential` con expiración de 1 hora, calculados con HMAC-SHA1 según el protocolo REST API de Coturn (RFC 8489 §9.2).

### Modified Capabilities

- `remote-assistance`: El scenario "Conexión exitosa fuera de LAN (TURN)" pasa de depender de variables de entorno estáticas en el cliente a obtener credenciales dinámicas del servidor antes de abrir la conexión.

## Impact

- **Nueva Edge Function**: `supabase/functions/get-turn-credentials/` — no requiere `--no-verify-jwt` ya que valida el JWT del usuario
- **Modificado**: `src/features/remote/useRemoteSession.ts` — llama a la Edge Function antes de crear `RTCPeerConnection`; fallback a solo-STUN si la Edge Function falla
- **Infraestructura**: `coturn/coturn` Docker en VPS Coolify, puertos 3478 UDP/TCP y 5349 TLS (media relay: 49152–65535 UDP)
- **Variables de entorno**: `VITE_TURN_URL` se mantiene (apunta al dominio del VPS); `VITE_TURN_USERNAME` y `VITE_TURN_CREDENTIAL` se eliminan del cliente; se añade `TURN_SECRET` como secret en la Edge Function
- **Sin nuevas dependencias npm** — HMAC-SHA1 disponible via Web Crypto API en Deno
