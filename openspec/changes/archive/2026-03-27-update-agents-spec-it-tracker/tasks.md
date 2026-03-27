## 1. Proyecto base y configuración

- [x] 1.1 Inicializar proyecto con `npm create vite@latest control-issue -- --template react-ts`
- [x] 1.2 Instalar y configurar Tailwind CSS v3 con `@vitejs/plugin-react`
- [x] 1.3 Inicializar ShadCN/UI con `npx shadcn-ui@latest init` y seleccionar tema base
- [x] 1.4 Instalar `@supabase/supabase-js` y crear `src/lib/supabaseClient.ts`
- [x] 1.5 Instalar `react-router-dom` y crear la estructura de rutas en `src/routes/`
- [x] 1.6 Instalar `prettier-plugin-tailwindcss` y configurar `.prettierrc`
- [x] 1.7 Crear estructura de carpetas: `src/features/`, `src/components/`, `src/hooks/`, `src/types/`
- [x] 1.8 Actualizar `openspec/specs/AGENTS.md` con el contenido de la spec `agents`

## 2. Supabase: Base de datos y Auth

- [x] 2.1 Crear proyecto en Supabase y configurar variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] 2.2 Crear tabla `profiles` (id, role, name, email) con trigger `on_auth_user_created`
- [x] 2.3 Crear tabla `issues` (id, title, description, status, priority, created_by, assigned_to, timestamps)
- [x] 2.4 Crear tabla `issue_comments` (id, issue_id, author_id, body, created_at)
- [x] 2.5 Crear tabla `issue_attachments` (id, issue_id, storage_path, file_name, uploaded_by, created_at)
- [x] 2.6 Crear tabla `devices` (id, name, owner_id, ip_local, last_seen, is_online)
- [x] 2.7 Crear tabla `remote_sessions` (id, issue_id, initiated_by, target_device_id, status, started_at, ended_at)
- [x] 2.8 Configurar políticas RLS en `issues`: `user` ve solo las suyas, `technician` ve las asignadas, `admin-it` ve todas
- [x] 2.9 Configurar políticas RLS en `remote_sessions` y `devices`
- [x] 2.10 Crear bucket `issue-attachments` en Supabase Storage con política de acceso por rol

## 3. Autenticación y gestión de sesión

- [x] 3.1 Crear página `LoginPage` con formulario email/contraseña usando ShadCN `Form`
- [x] 3.2 Implementar hook `useAuth` que expone `user`, `profile`, `signIn`, `signOut`
- [x] 3.3 Crear `AuthProvider` con contexto global y persistencia de sesión Supabase
- [x] 3.4 Implementar componente `ProtectedRoute` que redirige a `/login` si no autenticado
- [x] 3.5 Implementar `RoleGuard` que redirige con mensaje si el rol no tiene acceso a la ruta
- [x] 3.6 Añadir botón de logout en el layout principal

## 4. Layout y navegación

- [x] 4.1 Crear `AppLayout` con sidebar de navegación usando ShadCN y Tailwind
- [x] 4.2 Configurar rutas principales: `/`, `/issues`, `/issues/:id`, `/remote`, `/devices`, `/admin`
- [x] 4.3 Mostrar menú de navegación adaptado al rol del usuario autenticado

## 5. Módulo de incidencias (issue-tracker)

- [x] 5.1 Crear hook `useIssues` con queries y mutaciones a Supabase (`select`, `insert`, `update`)
- [x] 5.2 Crear página `IssuesListPage` con tabla filtrable (estado, prioridad, asignado) y búsqueda
- [x] 5.3 Crear componente `IssueFilters` con controles de filtro usando ShadCN `Select` y `Input`
- [x] 5.4 Crear modal/formulario `CreateIssueForm` con validación (título obligatorio, prioridad)
- [x] 5.5 Crear página `IssueDetailPage` con hilo de comentarios en tiempo real (Supabase Realtime)
- [x] 5.6 Implementar asignación de técnico en `IssueDetailPage` (solo visible para admin)
- [x] 5.7 Implementar cambio de estado de incidencia con control de permisos por rol
- [x] 5.8 Implementar subida de adjuntos a Supabase Storage con validación de tamaño (5 MB) y MIME type
- [x] 5.9 Suscribirse a cambios en tiempo real de la incidencia activa usando Supabase Realtime

## 6. Módulo de asistencia remota (remote-assistance)

- [x] 6.1 Crear página `DevicesPage` para listar y registrar dispositivos del usuario
- [x] 6.2 Implementar heartbeat del dispositivo: cliente JS envía ping a Supabase Realtime cada 30s para actualizar `is_online`
- [x] 6.3 Crear hook `useRemoteSession` para gestionar el ciclo de vida de la sesión
- [x] 6.4 Implementar flujo de solicitud de sesión: botón en `IssueDetailPage` y notificación al propietario
- [x] 6.5 Implementar notificación de solicitud entrante con acciones Aceptar / Rechazar
- [x] 6.6 Implementar señalización WebRTC usando Supabase Realtime (intercambio de SDP offer/answer e ICE candidates)
- [x] 6.7 Implementar `getDisplayMedia` en el cliente que comparte pantalla y envía el stream al técnico
- [x] 6.8 Renderizar el stream remoto recibido en la vista del técnico (`<video>` element)
- [x] 6.9 Configurar servidores STUN/TURN (coturn) y añadir ICE servers a la configuración WebRTC
- [x] 6.10 Implementar timeout de 30s con manejo de fallo de conexión WebRTC
- [x] 6.11 Detectar cierre de `getDisplayMedia` por el usuario y finalizar sesión automáticamente
- [x] 6.12 Crear componente `SessionChat` con canal de mensajes en tiempo real por sesión

## 7. Dashboard

- [x] 7.1 Crear página `DashboardPage` con tarjetas de KPIs usando ShadCN `Card`
- [x] 7.2 Implementar query de métricas: issues por estado, tiempo medio de resolución, volumen 24h
- [x] 7.3 Mostrar lista de sesiones remotas activas con Supabase Realtime subscription
- [x] 7.4 Mostrar lista de últimas 5 incidencias actualizadas con enlace al detalle
- [x] 7.5 Adaptar vista del dashboard según rol (admin ve todo, técnico ve su carga)

## 8. Panel de administración

- [x] 8.1 Crear página `AdminPage` accesible solo para `admin-it`
- [x] 8.2 Implementar gestión de usuarios: listar perfiles y cambiar roles
- [x] 8.3 Implementar vista de auditoría: historial de sesiones remotas finalizadas

## 9. Calidad y cierre

- [x] 9.1 Añadir tests de integración para políticas RLS con usuario de cada rol
- [x] 9.2 Verificar que `SUPABASE_SERVICE_ROLE_KEY` no aparece en código cliente
- [x] 9.3 Revisar orden de clases Tailwind con `prettier-plugin-tailwindcss` en todos los componentes
- [x] 9.4 Verificar ausencia de `any` en TypeScript con `tsc --noEmit`
- [x] 9.5 Revisar y completar `openspec/specs/PROJECT.md` con descripción del proyecto
