# Control Issue — Project Spec

## Overview

Control Issue es una aplicación web para el departamento de IT que permite:

1. **Gestión de incidencias**: Los usuarios reportan problemas, los técnicos los resuelven y los admins supervisan todo el ciclo de vida.
2. **Asistencia remota**: Los técnicos pueden iniciar sesiones de compartición de pantalla con ordenadores de la empresa (en red local o externa) usando WebRTC + Supabase Realtime como canal de señalización.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite 5 + React 18 + TypeScript |
| Estilos | Tailwind CSS v3 + ShadCN/UI |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Routing | react-router-dom v7 |
| Acceso remoto | WebRTC (`getDisplayMedia`) |

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Crea y ve sus propias incidencias |
| `technician` | Ve y gestiona las incidencias asignadas; inicia sesiones remotas |
| `admin-it` | Acceso completo: asigna técnicos, gestiona roles, ve auditoría |

## Estructura del repositorio

```
Control-issue/
  src/
    features/
      auth/          ← AuthProvider, useAuth, LoginPage, ProtectedRoute, RoleGuard
      issues/        ← useIssues, IssuesListPage, IssueDetailPage, CreateIssueForm, IssueFilters
      remote/        ← useRemoteSession, DevicesPage, RemoteSessionPage, SessionChat
      dashboard/     ← DashboardPage
      admin/         ← AdminPage
    components/      ← AppLayout, componentes ShadCN compartidos
    lib/             ← supabaseClient.ts, utils.ts
    types/           ← database.ts (tipos Supabase)
    routes/          ← react-router-dom router
  supabase/
    migrations/      ← SQL: schema, RLS policies, Storage bucket
  openspec/
    specs/           ← PROJECT.md, AGENTS.md
    changes/         ← Historial de cambios y tareas
```

## Configuración requerida

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Ejecutar `supabase/migrations/002_storage.sql`
4. Activar Realtime para las tablas: `issues`, `issue_comments`, `remote_sessions`, `devices`
5. Copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
6. `npm install && npm run dev`
