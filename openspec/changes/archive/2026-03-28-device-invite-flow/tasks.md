## 1. Migración de base de datos

- [x] 1.1 Crear `supabase/migrations/008_device_invites.sql`: tabla `device_invites` con columnas `id uuid PK`, `token uuid UNIQUE DEFAULT gen_random_uuid()`, `invited_by uuid FK profiles`, `invited_user_id uuid FK profiles`, `device_id uuid FK devices (nullable)`, `session_id uuid FK remote_sessions (nullable)`, `expires_at timestamptz`, `used_at timestamptz nullable`, `created_at timestamptz DEFAULT now()`
- [x] 1.2 Agregar RLS a `device_invites`: `admin-it` puede INSERT y SELECT propios; el usuario invitado puede SELECT donde `invited_user_id = auth.uid()`; UPDATE permitido solo para marcar `used_at` y `device_id` cuando `invited_user_id = auth.uid()` y `used_at IS NULL`

## 2. Generación del invite (admin)

- [x] 2.1 En `src/features/remote/DevicesPage.tsx`, agregar selector de usuario con botón "Invitar equipo" en la sección "Dispositivos de usuarios" (solo visible para `admin-it`)
- [x] 2.2 Al pulsar "Invitar equipo": insertar en `device_invites` con `invited_by`, `invited_user_id`, `expires_at = now() + interval '24 hours'`; construir la URL `/invite/:token`; copiar al clipboard con `navigator.clipboard.writeText`
- [x] 2.3 Mostrar feedback visual "Link copiado ✓" durante 3 segundos tras copiar

## 3. Página de invitación (`/invite/:token`)

- [x] 3.1 Crear `src/features/invite/InvitePage.tsx` con ruta pública en el router: `/invite/:token`
- [x] 3.2 Al montar, cargar el invite desde Supabase por `token`; manejar estados: cargando, expirado, ya usado, de otro usuario, válido
- [x] 3.3 Si el usuario no está autenticado, redirigir a `/login?redirect=/invite/:token`; mostrar en `LoginPage` el banner "Iniciá sesión para autorizar la conexión con tu soporte técnico" cuando el param `redirect` apunta a `/invite/`
- [x] 3.4 Mostrar UI simplificada para el estado válido: título "Tu soporte técnico quiere conectarse", descripción en lenguaje natural, botón principal "Autorizar conexión"
- [x] 3.5 Mostrar mensajes claros para estados de error: link caducado, link ya usado, link de otro usuario

## 4. Lógica de aceptación

- [x] 4.1 Al pulsar "Autorizar": inferir nombre del dispositivo desde `navigator.userAgent` (detectar macOS/Windows/Linux + primer nombre del perfil); insertar en `devices`
- [x] 4.2 Actualizar el invite con `used_at = now()` y `device_id = nuevo device id`
- [x] 4.3 Si el invite tiene `session_id`, redirigir a `/remote/:session_id`; si no, redirigir a `/devices` con mensaje de confirmación

## 5. Router

- [x] 5.1 Registrar la ruta `/invite/:token` en el router de la app apuntando a `InvitePage`; la ruta debe ser accesible sin autenticación (no envuelta en `ProtectedRoute`)
