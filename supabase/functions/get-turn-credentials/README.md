# Edge Function: get-turn-credentials

Genera credenciales TURN efímeras (1 hora) usando HMAC-SHA1 según el protocolo REST API de Coturn (RFC 8489 §9.2). Las credenciales permanentes nunca se exponen al cliente.

## Secrets requeridos

Configurar en Supabase Dashboard → Edge Functions → Secrets (o via CLI):

| Secret | Valor |
|--------|-------|
| `TURN_SECRET` | El mismo valor que `static-auth-secret` en `coturn.conf`. Genera con `openssl rand -hex 32` |
| `TURN_URL` | URL del servidor TURN. Usar `turns:` para TLS. Ej: `turns:turn.tudominio.com:5349` |

```bash
supabase secrets set TURN_SECRET=<valor> TURN_URL=turns:turn.tudominio.com:5349 --project-ref <ref>
```

## Deploy

```bash
npx supabase functions deploy get-turn-credentials --project-ref <ref>
```

> No usar `--no-verify-jwt` — esta función verifica el JWT internamente y lo necesita para autenticar al usuario.

## Respuesta

```json
{
  "urls": "turns:turn.tudominio.com:5349",
  "username": "1234567890:uuid-del-usuario",
  "credential": "base64-hmac-sha1"
}
```

## Errores

| Código | Causa |
|--------|-------|
| `401` | JWT ausente o inválido |
| `500` | `TURN_SECRET` o `TURN_URL` no configurados |
