# Deployment Runbook (master -> app.ariancoro.com)

Este documento define el flujo operativo único para producción.

## Objetivo

Cuando se mergea a `master`, el deploy debe ser automático, verificable y sin pasos manuales ambiguos.

## Flujo oficial

1. Se mergea una PR a `master`.
2. GitHub Actions ejecuta `.github/workflows/deploy.yml`.
3. El workflow:
   - valida secretos requeridos,
   - dispara deploy usando API oficial de Coolify (`/api/v1/deploy?uuid=...`),
   - ejecuta smoke test obligatorio contra `APP_HEALTHCHECK_URL`.
4. Solo se considera deploy exitoso si:
   - Coolify devuelve deployment UUID válido, y
   - `APP_HEALTHCHECK_URL` responde 2xx/3xx con HTML esperado de la app.

## Secretos requeridos en GitHub

- `COOLIFY_API_BASE_URL` (ej: `https://coolify.ariancoro.com/api/v1`)
- `COOLIFY_API_TOKEN`
- `COOLIFY_APP_UUID`
- `APP_HEALTHCHECK_URL` (ej: `https://app.ariancoro.com/`)

### Compatibilidad temporal (deprecado)

- `COOLIFY_TOKEN` se mantiene como fallback temporal.
- Fecha objetivo de retiro: **2026-04-30**.

## Configuración requerida en Coolify + Cloudflare

1. La app productiva en Coolify debe apuntar al repo `Arian1192/Control-issue`, branch `master`.
2. En Coolify, configurar dominio de la app: `app.ariancoro.com`.
3. En Cloudflare DNS, `app` debe resolver al VPS/proxy de Coolify (ruta directa recomendada).
4. Certificado TLS activo para `app.ariancoro.com`.

## Checklist post-merge (rápido)

1. Verificar run de deploy en GitHub Actions:
   - trigger OK
   - deployment UUID presente
   - smoke test en verde
2. Verificar app manualmente:
   - abrir `https://app.ariancoro.com`
   - login carga sin 404/5xx
3. Guardar enlace del run exitoso en el PR mergeado (comentario final opcional).

## Rollback operacional

Si un merge rompe producción:

1. Revertir commit en `master`.
2. Merge del revert a `master`.
3. Esperar deploy automático.
4. Confirmar smoke test + validación manual.

> No usar deploys manuales ad-hoc para saltar el flujo salvo incidente crítico documentado.

## Ownership y rotación de credenciales

- Owner primario: equipo de plataforma/infra del proyecto.
- Rotación `COOLIFY_API_TOKEN`: cada 90 días o ante incidente.
- Cada rotación debe actualizar:
  - GitHub Secret `COOLIFY_API_TOKEN`
  - registro interno de fecha de rotación y responsable

