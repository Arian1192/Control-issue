## 1. Infraestructura Coturn + Docker Compose

- [x] 1.1 Crear `docker-compose.yml` en la raíz del proyecto con tres servicios: `app` (Nginx sirviendo el build de Vite), `coturn` (`coturn/coturn`), y `cloudflared` (`cloudflare/cloudflared`) para el tunnel
- [x] 1.2 Crear `Dockerfile` multi-stage para el frontend: stage `build` (Node 20 Alpine, `npm ci && npm run build`) + stage `serve` (Nginx Alpine copiando `dist/`)
- [x] 1.3 Crear `nginx.conf` para servir la SPA: `try_files $uri $uri/ /index.html` con gzip y headers de caché correctos para assets
- [x] 1.4 Crear `coturn.conf` con `use-auth-secret`, `static-auth-secret=${TURN_SECRET}`, `realm=${TURN_REALM}`, puertos 3478/5349, rango media 49152–65535, y `external-ip` leído de variable de entorno
- [x] 1.5 Crear `.env.example` actualizado con `TURN_SECRET`, `TURN_REALM`, `CLOUDFLARE_TUNNEL_TOKEN`, `VITE_TURN_URL` (formato `turns:turn.dominio.com:5349`) y eliminar `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`
- [x] 1.6 Añadir `.dockerignore` excluyendo `node_modules`, `.env*`, `openspec/`, `.claude/`

## 2. Edge Function `get-turn-credentials`

- [x] 2.1 Crear `supabase/functions/get-turn-credentials/index.ts` con handler que valida el JWT de Supabase del request usando `supabase.auth.getUser(token)`
- [x] 2.2 Implementar generación HMAC-SHA1: `username = \`${expiry}:${userId}\`` donde `expiry = Math.floor(Date.now()/1000) + 3600`; `credential = base64(HMAC-SHA1(TURN_SECRET, username))` usando `crypto.subtle` (Web Crypto, disponible en Deno sin imports)
- [x] 2.3 Devolver respuesta JSON `{ urls, username, credential }` donde `urls` se construye desde la variable de entorno `TURN_URL` de la función; responder 401 si JWT inválido y 500 si `TURN_SECRET` no está configurado
- [x] 2.4 Añadir `TURN_SECRET` y `TURN_URL` a los secrets de la Edge Function en Supabase (documentar en el README de la función)

## 3. Actualización de `useRemoteSession.ts`

- [x] 3.1 Reemplazar `buildIceServers()` (síncrona, usa env vars del cliente) por `fetchIceServers(supabaseClient)` (async): llama a `get-turn-credentials` con el token de sesión del usuario autenticado
- [x] 3.2 Implementar fallback en `fetchIceServers`: si `VITE_TURN_URL` no está definida o la Edge Function falla, devolver solo `[{ urls: 'stun:stun.l.google.com:19302' }]` y loguear un warning
- [x] 3.3 En el sharer (`startAsSharer`): llamar `fetchIceServers()` en paralelo con `getDisplayMedia()` usando `Promise.all` para no añadir latencia secuencial; crear la `RTCPeerConnection` con los ICE servers resueltos
- [x] 3.4 En el viewer (`startAsViewer`): llamar `fetchIceServers()` antes de crear la `RTCPeerConnection`
- [x] 3.5 Eliminar las constantes `TURN_USERNAME`, `TURN_CREDENTIAL` y `TURN_CONFIGURED` del módulo

## 4. Cloudflare Tunnel

- [ ] 4.1 Crear un Tunnel en el Dashboard de Cloudflare → Zero Trust → Networks → Tunnels; guardar el token en `CLOUDFLARE_TUNNEL_TOKEN`
- [ ] 4.2 Configurar la ruta del tunnel: `app.tudominio.com` → `http://app:80` (usando el nombre del servicio Docker interno)
- [ ] 4.3 Configurar DNS en Cloudflare: registro `A` de `turn.tudominio.com` apuntando a la IP pública del VPS (necesario para Coturn — UDP no pasa por el tunnel)
- [ ] 4.4 Verificar que los puertos 3478 UDP/TCP y 5349 TCP están abiertos en el firewall del VPS host

## 5. Verificación

- [ ] 5.1 Levantar el stack con `docker compose up` y verificar que el frontend es accesible en `app.tudominio.com` vía el tunnel
- [ ] 5.2 Verificar Coturn con `turnutils_uclient -t -u <username> -w <credential> turn.tudominio.com` — debe responder con `TURN allocation successful`
- [ ] 5.3 Verificar que `get-turn-credentials` devuelve 200 con credenciales válidas cuando se llama con JWT de usuario autenticado, y 401 sin JWT
- [ ] 5.4 Probar sesión remota con técnico en red diferente al usuario (ej. técnico en 4G, usuario en WiFi): la sesión debe pasar a `activa` y mostrar el stream de pantalla
- [ ] 5.5 Verificar fallback: con `VITE_TURN_URL` vacía, la sesión en LAN sigue funcionando; `useRemoteSession` no lanza error
