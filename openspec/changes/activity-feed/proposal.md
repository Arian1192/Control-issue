## Why

El admin-it no tiene visibilidad en tiempo real de lo que ocurre en la aplicación. Para supervisar operaciones, detectar incidencias críticas y auditar acciones, necesita un feed centralizado de actividad sin tener que navegar tabla por tabla.

## What Changes

- Nueva tabla `activity_log` en PostgreSQL con triggers automáticos sobre `issues`, `issue_comments`, `issue_attachments`, `remote_sessions` y `profiles`
- Widget de feed de actividad integrado en el dashboard principal (`DashboardPage`) visible solo para `admin-it`
- Feed en tiempo real vía Supabase Realtime con scroll y paginación ("cargar más")
- Filtros por tipo de evento: todos, incidencias, comentarios, sesiones remotas, usuarios
- Cada evento muestra icono distintivo, nombres propios (no UUIDs), timestamp relativo y enlace a la entidad

## Capabilities

### New Capabilities
- `activity-feed`: Feed de actividad en tiempo real para admin-it con historial persistente, filtros por tipo de evento y eventos enriquecidos con contexto (nombres, previews de texto, prioridades)

### Modified Capabilities
- `dashboard`: El dashboard principal incorpora el widget de actividad para admin-it en su layout

## Impact

- Nueva migración SQL: tabla `activity_log` + triggers en 5 tablas
- `DashboardPage.tsx`: añadir widget `ActivityFeed` con layout adaptado al rol
- Nuevo componente `src/features/admin/ActivityFeed.tsx`
- Supabase Realtime: nueva suscripción a `activity_log`
- RLS: solo `admin-it` puede leer `activity_log`
