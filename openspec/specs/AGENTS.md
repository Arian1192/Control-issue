# Instructions for Agents

## Overview

Este documento define las convenciones, stack tecnológico y reglas de calidad que el agente debe seguir al trabajar en **Control Issue** — una aplicación web para que el encargado de IT pueda centralizar el seguimiento de incidencias de la empresa y brindar asistencia remota a ordenadores en red local o externa.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Bundler | Vite 5 |
| UI Framework | React 18 + TypeScript |
| Estilos | Tailwind CSS v3 |
| Componentes | ShadCN/UI (basado en Radix UI) |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Routing | react-router-dom v7 |
| Acceso remoto | WebRTC (`getDisplayMedia`) + señalización vía Supabase Realtime |

## Requirements

### Stack tecnológico del proyecto

El agente SHALL conocer y aplicar el stack tecnológico oficial del proyecto en todas las decisiones de implementación.

**Componentes de UI**: Usar ShadCN/UI sobre Radix UI con clases Tailwind CSS. No añadir otras librerías de componentes (Material UI, Ant Design, Chakra, etc.).

**Datos y backend**: Usar el cliente `@supabase/supabase-js` importado desde `@/lib/supabaseClient`. No introducir ORMs ni clientes HTTP alternativos para operaciones de base de datos.

**Configuración del proyecto**:
- Bundler: Vite con `@vitejs/plugin-react`
- Alias de importación: `@/` apunta a `./src/`
- TypeScript estricto: `strict: true`, `noEmit: true`

### Convenciones de código

**Componentes React**:
- PascalCase para nombre de archivo y del componente exportado
- Un componente por archivo
- Named exports preferidos sobre default exports (excepto en páginas/rutas)

**Custom Hooks**:
- Nombre con prefijo `use` en camelCase
- Ubicación: `src/hooks/` para hooks globales, o dentro del feature (`src/features/<feature>/`)

**TypeScript**:
- No usar `any`. Si el tipo es desconocido, usar `unknown` con type guard explícito
- Preferir interfaces para objetos de datos, `type` para uniones y utilitarios
- Los tipos de base de datos viven en `src/types/database.ts` (generado por Supabase CLI)

**Clases Tailwind**:
- Orden siguiendo `prettier-plugin-tailwindcss`: layout → spacing → typography → color → estado
- Usar `cn()` de `@/lib/utils` para combinar clases condicionalmente

### Estructura de carpetas

```
src/
  features/
    auth/          ← Login, AuthProvider, ProtectedRoute, RoleGuard
    issues/        ← IssuesListPage, IssueDetailPage, useIssues, CreateIssueForm
    remote/        ← DevicesPage, RemoteSessionPage, useRemoteSession, SessionChat
    dashboard/     ← DashboardPage
    admin/         ← AdminPage
  components/      ← ShadCN/UI + componentes compartidos entre features
    ui/            ← Componentes ShadCN generados
  hooks/           ← Hooks globales (useAuth, etc.)
  lib/             ← supabaseClient.ts, utils.ts
  types/           ← database.ts, index.ts
  routes/          ← Configuración de react-router-dom
```

**Regla**: Si un componente es usado por más de un feature, moverlo a `src/components/`. No duplicar dentro de features individuales.

### Mensajes de commit

Seguir **Conventional Commits**:

| Tipo | Uso |
|------|-----|
| `feat(<scope>):` | Nueva funcionalidad |
| `fix(<scope>):` | Corrección de bug |
| `chore(<scope>):` | Tareas de mantenimiento, deps |
| `refactor(<scope>):` | Refactorización sin cambio de comportamiento |
| `docs(<scope>):` | Documentación |
| `test(<scope>):` | Tests |

Ejemplo: `feat(issues): add real-time comment subscription`

### Seguridad en operaciones Supabase

**RLS**: No añadir filtros manuales de `user_id` que dupliquen la política RLS. Confiar en que RLS los aplica automáticamente en el cliente anon.

**Service role key**: `SUPABASE_SERVICE_ROLE_KEY` solo puede usarse en Edge Functions o scripts de servidor. Nunca en código que se ejecute en el navegador (no en `src/`).

**Variables de entorno cliente**: Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son seguros para exponer en el cliente.

## Tools

- `npx supabase gen types typescript --project-id <id>` — Regenerar `src/types/database.ts` tras cambios en el schema
- `npx shadcn-ui@latest add <component>` — Añadir componentes ShadCN
- `npm run dev` — Servidor de desarrollo
- `npm run build` — Build de producción (ejecuta `tsc -b` antes)
- `npm run lint` — ESLint

## Workflow

1. Leer los specs relevantes en `openspec/specs/` antes de implementar
2. Implementar en la feature correspondiente (`src/features/<feature>/`)
3. Extraer a `src/components/` si el componente se comparte entre features
4. Ejecutar `tsc --noEmit` para verificar tipos antes de hacer commit
5. Usar Conventional Commits

## Best Practices

- Mantener los componentes pequeños y con responsabilidad única
- Los hooks encapsulan la lógica de Supabase; los componentes solo renderizan
- Suscripciones de Supabase Realtime: limpiar siempre con `channel.unsubscribe()` en el cleanup de `useEffect`
- Validar inputs de usuario en el cliente antes de enviar a Supabase (size, MIME type para adjuntos)
- Las sesiones WebRTC deben manejar siempre el caso de fallo de ICE (timeout 30s)

## Feedback

Abrir un issue en el repositorio o comentar en la incidencia correspondiente en la aplicación.

## Feedback Loop

Los cambios en requisitos o convenciones deben reflejarse primero en `openspec/specs/` y luego implementarse. No modificar comportamiento sin actualizar primero la spec correspondiente.
