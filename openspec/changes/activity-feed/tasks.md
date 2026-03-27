## 1. Base de datos

- [x] 1.1 Crear migración `004_activity_log.sql`: tabla `activity_log` con columnas `id`, `type`, `actor_id`, `entity_type`, `entity_id`, `metadata jsonb`, `created_at`
- [x] 1.2 Añadir índice en `created_at DESC` para paginación eficiente
- [x] 1.3 Habilitar RLS en `activity_log`: solo `admin-it` puede hacer SELECT, nadie puede INSERT/UPDATE/DELETE desde el cliente
- [x] 1.4 Crear función trigger `log_issue_insert()`: registra `issue_created` con metadata `{ title, priority, created_by_name }`
- [x] 1.5 Crear función trigger `log_issue_update()`: detecta cambios en `status` → `status_changed` y en `assigned_to` → `issue_assigned` con metadata apropiado
- [x] 1.6 Crear función trigger `log_comment_insert()`: registra `comment_added` con metadata `{ issue_title, body_preview, author_name }`
- [x] 1.7 Crear función trigger `log_attachment_insert()`: registra `attachment_added` con metadata `{ issue_title, file_name }`
- [x] 1.8 Crear función trigger `log_session_insert()`: registra `session_started` con metadata `{ issue_title, device_name, initiated_by_name }`
- [x] 1.9 Crear función trigger `log_session_update()`: detecta `status = 'finalizada'` → `session_ended` y `status = 'rechazada'` → `session_rejected`
- [x] 1.10 Crear función trigger `log_profile_update()`: detecta cambios en `is_active` → `user_deactivated` o `user_reactivated` con metadata `{ name, email }`
- [x] 1.11 Adjuntar todos los triggers a sus respectivas tablas

## 2. Tipos TypeScript

- [x] 2.1 Añadir tipo `ActivityLog` en `src/types/database.ts` con todos los campos de la tabla
- [x] 2.2 Crear tipo `ActivityEventType` con todos los valores posibles de `type`

## 3. Componente ActivityFeed

- [x] 3.1 Crear `src/features/admin/ActivityFeed.tsx` con carga inicial de 20 eventos ordenados por `created_at DESC`
- [x] 3.2 Implementar suscripción Realtime a `activity_log` para insertar nuevos eventos al inicio del array
- [x] 3.3 Implementar botón "Cargar más" que hace fetch de los siguientes 20 eventos (offset/limit)
- [x] 3.4 Implementar filtros de categoría como chips: Todos / Incidencias / Comentarios / Sesiones / Usuarios
- [x] 3.5 El filtro aplica sobre los eventos ya cargados en cliente (sin nueva query)
- [x] 3.6 Implementar función `getEventIcon(type)`: devuelve icono Lucide y clase de color por tipo de evento
- [x] 3.7 Implementar función `getEventLabel(event)`: devuelve texto descriptivo usando `metadata` (nombres propios, not UUIDs)
- [x] 3.8 Implementar timestamp relativo con `formatRelative(date)`: "hace 2m", "hace 1h", "ayer"
- [x] 3.9 Eventos con `entity_type = 'issue'` y `entity_id` son clicables → navegan a `/issues/:entity_id`
- [x] 3.10 Mostrar indicador `● Live` animado en la cabecera del widget
- [x] 3.11 Cuando `actor_id` es NULL mostrar "Sistema" como actor

## 4. Integración en DashboardPage

- [x] 4.1 Importar `ActivityFeed` en `DashboardPage.tsx`
- [x] 4.2 Renderizar `<ActivityFeed />` debajo del grid existente solo cuando `isAdmin === true`

## 5. Cierre

- [x] 5.1 Ejecutar `tsc --noEmit` y corregir errores de tipos
- [x] 5.2 Verificar que roles `technician` y `user` no ven el widget ni pueden consultar `activity_log`
