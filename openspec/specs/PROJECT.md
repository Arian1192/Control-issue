# Control Issue — Project Spec

## Overview

Control Issue es una aplicación web interna para el departamento de IT que centraliza la gestión de incidencias, la asistencia remota y la administración de usuarios de la empresa.

### Qué problema resuelve

Los departamentos de IT necesitan un canal estructurado para que los empleados reporten problemas técnicos y para que los técnicos los gestionen con trazabilidad. Además, en muchos casos la resolución requiere acceder remotamente al equipo del usuario. Control Issue unifica ambas necesidades en una sola herramienta interna.

### Funcionalidades implementadas

1. **Gestión de incidencias** — Los usuarios reportan problemas con título, descripción y prioridad. Los técnicos gestionan el ciclo de vida (abierto → en-progreso → resuelto → cerrado), añaden comentarios en tiempo real y adjuntan archivos (logs, capturas). Los admins asignan incidencias a técnicos o a sí mismos. Desde el detalle de una incidencia se puede iniciar directamente una sesión de asistencia remota.

2. **Asistencia remota** — Los técnicos y admins inician sesiones remotas desde incidencias o dispositivos. La app coordina el flujo (`pendiente → aceptada → activa → finalizada/rechazada/fallida/cancelada`) y realiza handoff a RustDesk self-hosted: el usuario comparte su ID y credenciales temporales, y el técnico se conecta usando RustDesk (camino principal: cliente nativo; cliente web opcional).

3. **Invitación de dispositivos** — El admin-it o technician genera un link de invitación (`/invite/:token`) para que un usuario registre su equipo sin configuración manual. El link expira en 24 horas, es de un solo uso, y puede quedar vinculado a una incidencia o a una sesión remota pendiente. El dispositivo se registra automáticamente con nombre inferido del user-agent.

4. **Gestión de dispositivos** — Los usuarios registran sus ordenadores desde `DevicesPage`. El sistema detecta el estado online/offline mediante heartbeat cada 30 segundos y almacena la IP local (vía WebRTC STUN). Los dispositivos se pueden renombrar o eliminar.

5. **Gestión de usuarios** — El admin puede crear cuentas de usuario directamente desde la app (sin acceder al Dashboard de Supabase), asignar roles, editar datos de perfil y desactivar/reactivar cuentas. Los usuarios desactivados pierden el acceso inmediatamente vía RLS y son redirigidos al login.

6. **Feed de actividad en vivo** — Los admins disponen de un feed en tiempo real con todos los eventos del sistema (incidencias, comentarios, sesiones, usuarios). Accesible desde el dashboard y desde cualquier página vía el drawer lateral persistente (icono en sidebar y header mobile).

7. **Auditoría** — El admin dispone de un registro de sesiones remotas finalizadas con dispositivo, técnico, incidencia vinculada, estado final y duración.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 + TypeScript |
| Estilos | Tailwind CSS v3 + ShadCN/UI (Radix UI) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Routing | react-router-dom v7 |
| Acceso remoto | RustDesk OSS self-host (`hbbs` + `hbbr`) + coordinación de sesión en Supabase Realtime |
| Funciones privilegiadas | Supabase Edge Functions (Deno) |

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Crea incidencias y ve solo las suyas; registra dispositivos; acepta/rechaza sesiones remotas; acepta invitaciones de link |
| `technician` | Ve y gestiona las incidencias asignadas; inicia sesiones remotas desde incidencias o dispositivos; comenta y adjunta archivos |
| `admin-it` | Acceso completo: asigna incidencias, gestiona usuarios, genera links de invitación, ve feed de actividad y auditoría de sesiones |

## Arquitectura de seguridad

- **Row Level Security (RLS)** en todas las tablas: cada rol accede solo a sus datos
- **`is_active`** en `profiles`: usuarios desactivados quedan excluidos de todas las políticas RLS
- **Edge Function `admin-create-user`**: operaciones privilegiadas (crear/actualizar usuarios en `auth.users`) se ejecutan en servidor con `service_role_key`, nunca expuesta al cliente
- La función verifica el JWT del llamante con `adminClient.auth.getUser()` y comprueba `role = 'admin-it'` antes de operar
- **`device_invites`**: tokens UUID de un solo uso con expiración, gestionados con RLS por `invited_by` e `invited_user_id`, con contexto opcional de `issue_id` / `session_id` para continuar el flujo remoto

## Estructura del repositorio

```
Control-issue/
  src/
    features/
      auth/          ← AuthProvider, useAuth, LoginPage, ProtectedRoute, RoleGuard
      issues/        ← IssuesListPage, IssueDetailPage, CreateIssueForm, IssueFilters
      remote/        ← useRemoteSession, DevicesPage, RemoteSessionPage, SessionChat
      invite/        ← InvitePage (ruta pública /invite/:token)
      dashboard/     ← DashboardPage
      admin/         ← AdminPage, ActivityFeed, UserManagementPage, UserFormModal
    components/      ← AppLayout, ActivityFeedDrawer, componentes ShadCN compartidos
    lib/             ← supabaseClient.ts, getLocalIp.ts, utils.ts
    types/           ← database.ts, index.ts
    routes/          ← react-router-dom router
  supabase/
    functions/
      admin-create-user/  ← Edge Function para gestión de usuarios
    migrations/
      001_initial_schema.sql       ← Schema base: profiles, issues, comments, devices, remote_sessions
      002_storage.sql              ← Storage bucket para adjuntos
      003_user_management.sql      ← RLS y Edge Function para gestión de usuarios
      004_activity_log.sql         ← Tabla activity_log, triggers y RLS
      011_device_invites_fk_set_null.sql ← FK device_invites ON DELETE SET NULL
      012_remote_sessions_rustdesk_pivot.sql ← Lifecycle remoto + metadatos RustDesk + índice de sesión única
      013_remote_sessions_atomic_start.sql ← RPC atómica para crear/recuperar sesión abierta por dispositivo
      014_reconcile_remote_invites_and_phases.sql ← Reconciliación de invites, created_at y fases canónicas
  openspec/
    specs/           ← PROJECT.md, AGENTS.md, specs por capacidad
    changes/
      archive/       ← Historial de cambios implementados
```

## Configuración para nuevo entorno

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar las migraciones en el SQL Editor en orden (001 → 014)
3. Activar Realtime para las tablas: `issues`, `issue_comments`, `remote_sessions`, `devices`, `activity_log`
4. Copiar `.env.example` a `.env.local` y rellenar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RUSTDESK_ID_SERVER`
   - `VITE_RUSTDESK_KEY`
   - *(Opcional)* `VITE_RUSTDESK_RELAY_SERVER`, `VITE_RUSTDESK_WEB_CLIENT_ENABLED`, `VITE_RUSTDESK_WEB_CLIENT_URL`, `VITE_RUSTDESK_WEB_CLIENT_TEMPLATE`, enlaces de descarga por OS
5. Desplegar la Edge Function:
   ```bash
   npx supabase functions deploy admin-create-user --project-ref <project-ref> --no-verify-jwt
   ```
   > `--no-verify-jwt` es necesario porque los proyectos nuevos de Supabase usan JWTs con algoritmo ES256, que el gateway aún no valida. La función hace su propia verificación internamente.
6. `npm install && npm run dev`
7. Crear el primer usuario admin-it directamente en Supabase Dashboard → Authentication → Users, luego actualizar su `role` a `admin-it` en la tabla `profiles`

## Limitaciones conocidas

- **Dependencia de infraestructura RustDesk**: si `hbbs`/`hbbr` no están alcanzables o faltan puertos (21115/21116/21117), la sesión no puede concretarse aunque la app web esté operativa.
- **Cliente nativo del técnico**: el camino soportado del MVP depende de que el técnico tenga RustDesk instalado localmente; el web client no forma parte del criterio principal de aceptación.
- **Notificaciones fuera de la app**: No hay notificaciones push ni por email. El usuario debe tener la app abierta para recibir solicitudes de sesión.
