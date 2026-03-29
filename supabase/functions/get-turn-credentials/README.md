# Edge Function: get-turn-credentials

Genera credenciales TURN efímeras (1 hora) usando HMAC-SHA1 según el protocolo REST API de Coturn (RFC 8489 §9.2). Las credenciales permanentes nunca se exponen al cliente.

## Secrets requeridos

Configurar en Supabase Dashboard → Edge Functions → Secrets (o via CLI):

| Secret | Valor |
|--------|-------|
| `TURN_SECRET` | El mismo valor que `static-auth-secret` en `coturn.conf`. Genera con `openssl rand -hex 32` |
| `TURN_URL` | Una o varias URLs TURN separadas por comas. Ej: `turn:turn.tudominio.com:3478?transport=udp,turn:turn.tudominio.com:3478?transport=tcp,turns:turn.tudominio.com:5349?transport=tcp` |

```bash
supabase secrets set TURN_SECRET=<valor> TURN_URL='turn:turn.tudominio.com:3478?transport=udp,turn:turn.tudominio.com:3478?transport=tcp,turns:turn.tudominio.com:5349?transport=tcp' --project-ref <ref>
```

## Deploy

```bash
npx supabase functions deploy get-turn-credentials --project-ref <ref>
```

> No usar `--no-verify-jwt` — esta función verifica el JWT internamente y lo necesita para autenticar al usuario.

## Respuesta

```json
{
  "urls": [
    "turn:turn.tudominio.com:3478?transport=udp",
    "turn:turn.tudominio.com:3478?transport=tcp",
    "turns:turn.tudominio.com:5349?transport=tcp"
  ],
  "username": "1234567890:uuid-del-usuario",
  "credential": "base64-hmac-sha1"
}
```

## Nota de infraestructura

Cloudflare Tunnel puede seguir sirviendo la app web, pero el servidor TURN del navegador necesita un hostname público que resuelva directo al VPS con los puertos `3478/udp`, `3478/tcp`, `5349/tcp` y el rango UDP del relay abiertos en firewall/NAT.

## Errores

| Código | Causa |
|--------|-------|
| `401` | JWT ausente o inválido |
| `500` | `TURN_SECRET` o `TURN_URL` no configurados |
