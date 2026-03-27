## Context

El dashboard actual muestra KPIs estáticos e incidencias recientes, pero no hay ningún registro cronológico de acciones. El admin-it necesita saber qué está pasando sin tener que navegar tabla por tabla. La aplicación ya usa Supabase Realtime en otros puntos (comentarios, dashboard), por lo que el patrón es conocido.

## Goals / Non-Goals

**Goals:**
- Tabla `activity_log` persistente con triggers automáticos en las tablas relevantes
- Widget `ActivityFeed` integrado en `DashboardPage` solo para `admin-it`, debajo del grid actual
- Eventos enriquecidos: nombres propios, preview de texto, prioridad de la incidencia
- Filtros por categoría: todos / incidencias / comentarios / sesiones / usuarios
- Tiempo real vía Supabase Realtime + historial paginado ("cargar más")

**Non-Goals:**
- Notificaciones push o emails
- Feed visible para roles distintos de `admin-it`
- Edición o eliminación de entradas del log

## Decisions

### D1: Tabla dedicada `activity_log` en lugar de suscripciones directas a múltiples tablas

Alternativa descartada: suscribir Realtime a `issues`, `issue_comments`, etc. y derivar eventos en el cliente.

Razón: con suscripciones directas solo se capturan eventos mientras el admin está conectado. La tabla `activity_log` da historial persistente, permite paginación y reduce el número de canales Realtime abiertos a uno solo.

### D2: Triggers PostgreSQL para insertar en `activity_log`

Los triggers se ejecutan en la base de datos, lo que garantiza que ningún evento se pierde independientemente del origen de la escritura (cliente, Edge Function, migración). Alternativa descartada: insertar manualmente desde el frontend — frágil y no cubre todas las rutas de escritura.

El actor se captura via `auth.uid()` disponible en el contexto de la sesión PostgreSQL. Para operaciones via Edge Function (creación de usuarios) el actor puede ser NULL — se muestra como "Sistema".

### D3: Metadatos en columna JSONB `metadata`

Cada tipo de evento requiere contexto diferente. JSONB permite almacenar `{ issue_title, old_status, new_status, actor_name, assigned_to_name, body_preview }` sin normalizar en múltiples tablas. El campo `metadata` se desnormaliza intencionalmente: captura los nombres en el momento del evento para que el log sea inmutable e independiente de cambios posteriores.

### D4: Integración en `DashboardPage` debajo del grid existente

El widget ocupa el ancho completo debajo del grid de 2 columnas, con altura máxima fija (`max-h-96`) y scroll interno. No es una página nueva ni un tab — es una sección del dashboard visible al entrar, coherente con el objetivo de "no ocupar una página completa".

### D5: Filtros como botones de chip sobre el timeline

Un selector de categoría (`todos | incidencias | comentarios | sesiones | usuarios`) filtra el array en cliente — no requiere nueva query. La paginación sí requiere query (offset/limit sobre `activity_log`).

## Risks / Trade-offs

- [Volumen de datos] Los triggers generan una fila por cada acción. Con uso intensivo puede crecer rápido → Mitigación: añadir índice en `created_at` y considerar una política de retención (p.ej. borrar entradas > 90 días) en el futuro.
- [`auth.uid()` en triggers de Edge Function] Las operaciones de la Edge Function `admin-create-user` no tienen sesión de usuario PostgreSQL, por lo que `actor_id` será NULL → Mitigación: mostrar "Sistema" en el feed cuando `actor_id` es NULL.
- [Trigger en `issues` UPDATE] Un UPDATE puede cambiar múltiples campos a la vez. El trigger debe detectar qué cambió (`OLD.status != NEW.status`, `OLD.assigned_to != NEW.assigned_to`) y generar el evento apropiado — o múltiples eventos si cambian varios campos en la misma operación.

## Migration Plan

1. Ejecutar `004_activity_log.sql` en Supabase SQL Editor
2. Desplegar frontend (no requiere redeploy de Edge Functions)
3. Rollback: DROP TABLE activity_log CASCADE elimina tabla y triggers asociados sin afectar al resto del schema
