# Coolify Stack deploy

Este repo se despliega en Coolify como **Stack** usando `docker-compose.yml`.

## Servicios del stack

- `app`: build del frontend Vite servido por Nginx
- `coturn`: servidor TURN/STUN para asistencia remota fuera de LAN
- `cloudflared`: tunnel para publicar la app por HTTPS

## Variables requeridas en Coolify

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURN_URL=
TURN_SECRET=
TURN_REALM=
TURN_EXTERNAL_IP=
TURN_MIN_PORT=56000
TURN_MAX_PORT=56100
CLOUDFLARE_TUNNEL_TOKEN=
```

## Cómo desplegar

1. En Coolify, crea un recurso tipo **Stack** desde este repositorio.
2. Usa el archivo raíz `docker-compose.yml`.
3. Carga las variables de entorno del bloque anterior.
4. Asegúrate de que el host tenga abiertos `3478/udp`, `3478/tcp`, `5349/tcp` y el rango UDP configurado en `TURN_MIN_PORT`-`TURN_MAX_PORT`.
5. Crea un túnel en Cloudflare que apunte `app.tudominio.com` a `http://app:80`.
6. Crea DNS directo para el TURN server (`turn.tudominio.com`) apuntando a la IP pública del host.

## Nota sobre Coturn

`coturn` ahora usa un archivo plantilla (`coturn.conf`) y, al arrancar, genera `/tmp/turnserver.conf` expandiendo las variables de entorno dentro del contenedor antes de ejecutar `turnserver -c ...`. Esto evita la fragilidad de una lista larga de flags CLI en Coolify y también evita depender de interpolación automática dentro de `turnserver.conf`, que Coturn no hace por sí solo.

El rango UDP de relay queda controlado por `TURN_MIN_PORT` y `TURN_MAX_PORT` (por defecto `56000-56100`) para evitar conflictos operativos del host y mantener una apertura de firewall más compacta.
