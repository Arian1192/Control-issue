# Coolify Stack deploy (proxy directo recomendado)

Este repo se despliega en Coolify como **Stack** usando `docker-compose.yml`.

## Servicios del stack

- `app`: build del frontend Vite servido por Nginx
- `rustdesk-hbbs`: servidor de señalización / registro de IDs
- `rustdesk-hbbr`: relay de tráfico remoto
- `cloudflared` (**opcional**, perfil `tunnel`): tunnel legacy; no es la ruta principal de producción para la web

## Variables requeridas en Coolify (stack)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

VITE_RUSTDESK_ID_SERVER=
VITE_RUSTDESK_RELAY_SERVER=
VITE_RUSTDESK_KEY=
VITE_RUSTDESK_WEB_CLIENT_ENABLED=false
VITE_RUSTDESK_FORCE_PUBLIC_FALLBACK=false
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

# Solo si se habilita el perfil "tunnel" en docker compose
CLOUDFLARE_TUNNEL_TOKEN=
```

## Cómo desplegar

1. En Coolify, crea/actualiza un recurso tipo **Stack** desde este repositorio.
2. Usa el `docker-compose.yml` de raíz.
3. Carga las variables de entorno del bloque anterior.
4. Configurá el dominio de la app en Coolify como `app.ariancoro.com` (o equivalente en tu entorno).
5. Asegurate de abrir puertos en el host para RustDesk OSS:
   - `21115/tcp`
   - `21116/tcp`
   - `21116/udp`
   - `21117/tcp`
   - `21118/tcp` (opcional, web client)
   - `21119/tcp` (opcional, web client)
6. En Cloudflare DNS, apuntá `app` al VPS/Coolify (proxy directo recomendado para la web).
7. Para RustDesk, crear DNS directo (sin proxy) apuntando a la IP pública del VPS.

> Recomendación operativa: la web pública debe salir por el proxy/reverse-proxy de Coolify (dominio gestionado por Coolify).  
> `cloudflared` queda solo para casos legacy y no debe ser dependencia del deploy productivo.

## CI/CD de producción (master)

- El deploy productivo se dispara automáticamente en cada `push` a `master` desde `.github/workflows/deploy.yml`.
- El workflow usa la API oficial de Coolify y ejecuta smoke test obligatorio sobre `APP_HEALTHCHECK_URL`.
- Si Coolify rechaza el trigger o la URL no responde correctamente, el workflow **falla**.

## Alcance operativo del MVP

- Camino principal del técnico: **cliente nativo de RustDesk**
- Camino principal del usuario: descarga guiada desde la app + carga manual de `ID`/contraseña temporal
- El web client queda como **opcional**, no como requisito para cerrar la implementación
- Si el usuario todavía no tiene dispositivo registrado, la app genera un link `/invite/:token` para autorizar el equipo desde el que necesita ayuda

## Clave RustDesk (importante)

Definí una clave base64 en `RUSTDESK_KEY` y reutilizá ese mismo valor en `VITE_RUSTDESK_KEY`.

De esa forma:

- `hbbs`/`hbbr` arrancan con una clave estable (`-k`),
- los clientes pueden validar el servidor sin pasos manuales extra.

## Nota de arquitectura

La app no transporta video remoto. La app:

1. crea y coordina la sesión (Supabase),
2. guía al usuario en instalación/configuración,
3. permite fallback con link de acceso para registrar el equipo,
4. entrega al técnico el `ID`/password de RustDesk.

La conexión remota real ocurre en RustDesk (`hbbs`/`hbbr`).
