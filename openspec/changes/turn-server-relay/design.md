## Context

`useRemoteSession.ts` tiene `buildIceServers()` que agrega un servidor TURN si `VITE_TURN_URL`, `VITE_TURN_USERNAME` y `VITE_TURN_CREDENTIAL` están presentes. El problema: esas variables son credenciales **estáticas** expuestas en el bundle del cliente — cualquiera que inspeccione el JS puede usarlas indefinidamente para abusar del servidor TURN (coste de ancho de banda, relay para tráfico arbitrario).

El estándar para Coturn es el **TURN REST API** (documentado en RFC 8489 §9.2 y en la doc de Coturn): se genera un par `(username, credential)` efímero con HMAC-SHA1 sobre un secret compartido. El username tiene la forma `{timestamp}:{userId}` donde `timestamp` es la expiración Unix. El servidor TURN valida que `HMAC-SHA1(secret, username) == credential` y que no haya expirado. Sin el secret (que nunca sale del servidor), nadie puede fabricar credenciales válidas.

## Goals / Non-Goals

**Goals:**
- Habilitar conexiones WebRTC fuera de LAN mediante relay TURN
- Credenciales TURN generadas en el servidor, con expiración de 1 hora
- Solo usuarios autenticados con sesión remota válida pueden obtener credenciales
- Coturn self-hosted en VPS propio vía Coolify (sin coste variable)
- Fallback graceful a solo-STUN si la Edge Function no está disponible

**Non-Goals:**
- Implementar TURN sobre DTLS/SRTP (Coturn lo maneja internamente)
- Métricas de uso de bandwidth por sesión
- Múltiples servidores TURN o geo-routing
- Soporte para TURN sobre TCP como primera opción (UDP primero, TCP como fallback del propio ICE)

## Decisions

### 1. Coturn en Docker vía Coolify con dominio propio

Coturn (`coturn/coturn`) es el servidor TURN open-source de referencia, maduro y con soporte completo del protocolo REST API. Se despliega como servicio Docker en el VPS existente con Coolify.

Configuración clave:
```
use-auth-secret
static-auth-secret=<TURN_SECRET>
realm=turn.tudominio.com
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535
```

**Alternativas consideradas:**
- **Metered.ca / Twilio**: SaaS con credenciales dinámicas via API. Más simple de implementar pero coste variable ($0.40/GB relay). El VPS ya existe → Coturn es gratis.
- **Cloudflare Calls TURN**: Beta en 2025, API inestable. Descartar.

### 2. Edge Function `get-turn-credentials` para generación HMAC-SHA1

La función recibe el JWT de Supabase del usuario, verifica que está autenticado, y devuelve:
```json
{ "urls": "turn:turn.dominio.com:3478", "username": "1234567890:uuid", "credential": "base64hmac" }
```

Algoritmo:
```typescript
const expiry = Math.floor(Date.now() / 1000) + 3600  // 1 hora
const username = `${expiry}:${userId}`
const key = await crypto.subtle.importKey('raw', encode(TURN_SECRET), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
const sig = await crypto.subtle.sign('HMAC', key, encode(username))
const credential = btoa(String.fromCharCode(...new Uint8Array(sig)))
```

Web Crypto API está disponible en Deno nativamente — sin dependencias adicionales.

**Alternativas consideradas:**
- Credenciales estáticas en `.env` del cliente: descartado, expone el secret permanentemente en el bundle JS
- Long-term credentials de Coturn (user/pass fijos): descartado, mismo problema de exposición

### 3. `useRemoteSession` llama a la Edge Function antes de crear la `RTCPeerConnection`

`buildIceServers()` pasa a ser `async fetchIceServers()` que:
1. Llama a `get-turn-credentials` con el token de sesión
2. Si tiene éxito → devuelve `[stun, turn]`
3. Si falla (red, función caída, sin `VITE_TURN_URL`) → devuelve solo `[stun]` y loguea warning

La RTCPeerConnection se crea con los ICE servers ya resueltos, sin cambios en el resto del flujo de señalización.

**Alternativas consideradas:**
- Cachear credenciales en localStorage: innecesario, la sesión WebRTC dura minutos, no horas
- Llamar a la Edge Function solo cuando STUN falla: complicaría el ICE restart y añadiría latencia en el peor momento

### 4. Eliminar `VITE_TURN_USERNAME` y `VITE_TURN_CREDENTIAL` del cliente

Con credenciales dinámicas, estas variables dejan de tener sentido. Solo `VITE_TURN_URL` se mantiene en el cliente para que la Edge Function sepa qué servidor TURN usar (la URL es pública por naturaleza — no es un secret).

El secret `TURN_SECRET` vive únicamente como secret de la Edge Function en Supabase.

## Risks / Trade-offs

- **Latencia extra al iniciar sesión**: La llamada a la Edge Function añade ~100-200ms antes de crear la `RTCPeerConnection`. → Mitigación: llamar en paralelo con `getDisplayMedia()` en el sharer, ya que el usuario tarda varios segundos en seleccionar pantalla.
- **Coturn en el VPS → single point of failure**: Si el VPS cae, las sesiones fuera de LAN fallan. → Mitigación: fallback a solo-STUN (funciona en LAN); aceptable para un entorno IT interno.
- **Puertos UDP en el VPS**: El rango 49152–65535 UDP debe estar abierto en el firewall. → Mitigación: documentar en el setup; Coolify no gestiona firewall, se configura en el host.
- **TLS para TURN sobre 5349**: Navegadores modernos en HTTPS requieren TURN con TLS (`turns:`). → Mitigación: Coolify puede exponer Let's Encrypt para el dominio; configurar `turns:` en la URL devuelta por la Edge Function.

## Migration Plan

1. Desplegar Coturn en Coolify con el dominio `turn.dominio.com` y verificar con `turnutils_uclient`
2. Añadir `TURN_SECRET` como secret en Supabase (Dashboard → Edge Functions → Secrets)
3. Desplegar Edge Function `get-turn-credentials`
4. Actualizar `.env.local`: quitar `VITE_TURN_USERNAME`/`VITE_TURN_CREDENTIAL`, ajustar `VITE_TURN_URL=turns:turn.dominio.com:5349`
5. Deploy frontend con `useRemoteSession` actualizado
6. Rollback: si la Edge Function falla, el código cae en `[stun]`-only — las sesiones LAN siguen funcionando

## Open Questions

- ¿El VPS tiene IP pública fija o usa DDNS? Coturn necesita `external-ip` configurado si hay NAT en el host.
- ¿El dominio para el TURN server es uno existente o nuevo? Necesario para TLS con Let's Encrypt.
