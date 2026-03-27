# Control Issue — Project Spec

## Overview

Control Issue es una aplicación web interna para el departamento de IT que centraliza la gestión de incidencias, la asistencia remota y la administración de usuarios de la empresa.

### Qué problema resuelve

Los departamentos de IT necesitan un canal estructurado para que los empleados reporten problemas técnicos y para que los técnicos los gestionen con trazabilidad. Además, en muchos casos la resolución requiere acceder remotamente al equipo del usuario. Control Issue unifica ambas necesidades en una sola herramienta interna.

### Funcionalidades principales

1. **Gestión de incidencias** — Los usuarios reportan problemas con título, descripción y prioridad. Los técnicos gestionan el ciclo de vida (abierto → en-progreso → resuelto → cerrado), añaden comentarios en tiempo real y adjuntan archivos (logs, capturas). Los admins asignan incidencias a técnicos o a sí mismos.

2. **Asistencia remota** — Los técnicos y admins pueden iniciar una sesión de compartición de pantalla con el ordenador del usuario afectado, tanto en red local como externa, usando WebRTC con Supabase Realtime como canal de señalización. El usuario recibe una notificación en la app y acepta o rechaza la sesión.

3. **Gestión de usuarios** — El admin puede crear cuentas de usuario directamente desde la app (sin acceder al Dashboard de Supabase), asignar roles, editar datos de perfil y desactivar/reactivar cuentas. Los usuarios desactivados pierden el acceso inmediatamente vía RLS y son redirigidos al login.

4. **Auditoría** — El admin dispone de un registro de sesiones remotas finalizadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 + TypeScript |
| Estilos | Tailwind CSS v3 + ShadCN/UI (Radix UI) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Routing | react-router-dom v7 |
| Acceso remoto | WebRTC (`getDisplayMedia`) + Supabase Realtime (señalización) |
| Funciones privilegiadas | Supabase Edge Functions (Deno) |

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Crea incidencias y ve solo las suyas; registra dispositivos; acepta/rechaza sesiones remotas |
| `technician` | Ve y gestiona las incidencias asignadas; inicia sesiones remotas; comenta y adjunta archivos |
| `admin-it` | Acceso completo: asigna incidencias a técnicos o a sí mismo, gestiona usuarios (crear/editar/desactivar), ve auditoría de sesiones |

## Arquitectura de seguridad

- **Row Level Security (RLS)** en todas las tablas: cada rol accede solo a sus datos
- **`is_active`** en `profiles`: usuarios desactivados quedan excluidos de todas las políticas RLS
- **Edge Function `admin-create-user`**: operaciones privilegiadas (crear/actualizar usuarios en `auth.users`) se ejecutan en servidor con `service_role_key`, nunca expuesta al cliente
- La función verifica el JWT del llamante con `adminClient.auth.getUser()` y comprueba `role = 'admin-it'` antes de operar

## Estructura del repositorio

```
Control-issue/
  src/
    features/
      auth/          ← AuthProvider, useAuth, LoginPage, ProtectedRoute, RoleGuard
      issues/        ← IssuesListPage, IssueDetailPage, CreateIssueForm, IssueFilters, useIssues
      remote/        ← useRemoteSession, DevicesPage, RemoteSessionPage, SessionChat
      dashboard/     ← DashboardPage
      admin/         ← AdminPage, UserManagementPage, UserFormModal
    components/      ← AppLayout, componentes ShadCN compartidos
    lib/             ← supabaseClient.ts, edgeFunctions.ts, utils.ts
    types/           ← database.ts (tipos generados de Supabase)
    routes/          ← react-router-dom router
  supabase/
    functions/
      admin-create-user/  ← Edge Function para gestión de usuarios
    migrations/           ← 001_initial_schema.sql, 002_storage.sql, 003_user_management.sql
  openspec/
    specs/           ← PROJECT.md, AGENTS.md, specs por capacidad
    changes/
      archive/       ← Historial de cambios implementados
```

## Configuración para nuevo entorno

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar las migraciones en el SQL Editor (en orden):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_user_management.sql`
3. Activar Realtime para: `issues`, `issue_comments`, `remote_sessions`, `devices`
4. Copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Desplegar la Edge Function:
   ```bash
   npx supabase functions deploy admin-create-user --project-ref <project-ref> --no-verify-jwt
   ```
   > `--no-verify-jwt` es necesario porque los proyectos nuevos de Supabase usan JWTs con algoritmo ES256, que el gateway aún no valida. La función hace su propia verificación internamente.
6. `npm install && npm run dev`
7. Crear el primer usuario admin-it directamente en Supabase Dashboard → Authentication → Users, luego actualizar su `role` a `admin-it` en la tabla `profiles`
