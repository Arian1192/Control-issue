# Coolify Stack deploy (RustDesk integrado)

Este repo se despliega en Coolify como **Stack** usando `docker-compose.yml`.

## Servicios del stack

- `app`: build del frontend Vite servido por Nginx
- `rustdesk-hbbs`: servidor de señalización / registro de IDs
- `rustdesk-hbbr`: relay de tráfico remoto
- `cloudflared`: tunnel HTTPS para la app web (`app.tudominio.com`)

## Variables requeridas en Coolify

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

VITE_RUSTDESK_ID_SERVER=
VITE_RUSTDESK_RELAY_SERVER=
VITE_RUSTDESK_KEY=
VITE_RUSTDESK_WEB_CLIENT_URL=
VITE_RUSTDESK_WEB_CLIENT_TEMPLATE=
VITE_RUSTDESK_DOWNLOAD_WINDOWS_URL=
VITE_RUSTDESK_DOWNLOAD_MAC_INTEL_URL=
VITE_RUSTDESK_DOWNLOAD_MAC_ARM_URL=
VITE_RUSTDESK_DOWNLOAD_LINUX_URL=

RUSTDESK_HBBS_HOST=
RUSTDESK_RELAY_HOST=
RUSTDESK_KEY=
RUSTDESK_ALWAYS_USE_RELAY=N

CLOUDFLARE_TUNNEL_TOKEN=
```

## Cómo desplegar

1. En Coolify, crea/actualiza un recurso tipo **Stack** desde este repositorio.
2. Usa el `docker-compose.yml` de raíz.
3. Carga las variables de entorno del bloque anterior.
4. Asegurate de abrir puertos en el host:
   - `21115/tcp`
   - `21116/tcp`
   - `21116/udp`
   - `21117/tcp`
   - `21118/tcp` (opcional, web client)
   - `21119/tcp` (opcional, web client)
5. Cloudflare Tunnel: exponer solo la app web (`app.tudominio.com -> http://app:80`).
6. Para RustDesk, crear DNS directo (sin proxy) apuntando a la IP pública del VPS.

## Clave RustDesk (importante)

Definí una clave base64 en `RUSTDESK_KEY` y reutilizá ese mismo valor en `VITE_RUSTDESK_KEY`.

De esa forma:

- `hbbs`/`hbbr` arrancan con una clave estable (`-k`),
- los clientes pueden validar el servidor sin pasos manuales extra.

## Nota de arquitectura

La app no transporta video remoto. La app:

1. crea y coordina la sesión (Supabase),
2. guía al usuario en instalación/configuración,
3. entrega al técnico el `ID`/password de RustDesk.

La conexión remota real ocurre en RustDesk (`hbbs`/`hbbr`).
