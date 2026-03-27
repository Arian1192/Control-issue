## Context

El módulo de administración actual (`AdminPage`) tiene una tabla de usuarios con un selector de rol inline. No existe forma de crear usuarios desde la app — el admin debe ir al Dashboard de Supabase. Tampoco se puede editar el nombre/email de un perfil ni desactivar una cuenta.

El problema clave de seguridad: crear usuarios requiere la `service_role_key` de Supabase, que nunca debe llegar al navegador. La solución es una Supabase Edge Function que actúa como proxy seguro.

## Goals / Non-Goals

**Goals:**
- Crear usuarios desde la app sin exponer la `service_role_key` al cliente.
- Editar nombre, email y rol de cualquier perfil (solo `admin-it`).
- Desactivar/reactivar usuarios (soft-delete via campo `is_active`).
- Mantener coherencia entre `auth.users` (Supabase Auth) y `public.profiles`.

**Non-Goals:**
- Invitaciones por email (magic link onboarding) — fase futura.
- Gestión de 2FA o proveedores OAuth.
- Auto-servicio de edición de perfil por el propio usuario (queda para otra propuesta).

## Decisions

### 1. Creación de usuarios vía Edge Function

**Decisión**: Una Supabase Edge Function `admin-create-user` recibe `{email, password, name, role}`, verifica que el llamante es `admin-it` comprobando su JWT, y usa `supabase.auth.admin.createUser()` con la `service_role_key` en el entorno del servidor.

**Alternativas consideradas**:
- Llamar directamente a la Admin API de Supabase desde el cliente con la service key → **Descartado**: expone la clave en el navegador, vulnerabilidad crítica.
- Usar Supabase Database Functions con `security definer` → **Descartado**: no tienen acceso a `auth.admin` API.

**Flujo**:
```
Cliente (admin-it)
    │  POST /functions/v1/admin-create-user
    │  Authorization: Bearer <anon JWT del admin>
    ▼
Edge Function
    ├── Verifica que el JWT corresponde a un admin-it en profiles
    ├── Llama a supabase.auth.admin.createUser({ email, password })
    │   usando SERVICE_ROLE_KEY desde env
    └── El trigger on_auth_user_created crea el perfil automáticamente
        └── UPDATE profiles SET name=..., role=... WHERE id=new_user_id
```

### 2. Edición de perfil: cliente directo a Supabase

**Decisión**: La edición de nombre y rol se hace directamente desde el cliente con una query `UPDATE public.profiles`. La política RLS `profiles_update_admin` ya permite esto solo a `admin-it`.

Para cambiar el email de Auth (no solo el perfil), se necesita también la Admin API → se gestiona en la misma Edge Function con un endpoint de actualización.

### 3. Desactivación: campo `is_active` en `profiles`

**Decisión**: Añadir `is_active boolean default true` a `profiles`. Las políticas RLS de `issues`, `devices` y `remote_sessions` filtran usuarios con `is_active = false`. No se borra el registro de `auth.users` para preservar historial.

**Alternativa considerada**: Usar `auth.admin.banUser()` de Supabase → Se usa como complemento, pero `is_active` es la fuente de verdad en la app (más portable y consultable con RLS).

### 4. UI: modal reutilizable `UserFormModal`

**Decisión**: Un único modal con modo `create` / `edit` controlado por prop. Formulario con campos: nombre, email, contraseña (solo en create), rol, estado activo.

## Risks / Trade-offs

- **Edge Function cold start** → Mitigation: la creación de usuarios no es frecuente, la latencia puntual es aceptable.
- **Desincronía auth.users / profiles** → Mitigation: el trigger `on_auth_user_created` garantiza que siempre se crea el perfil. Si falla el UPDATE de nombre/rol posterior, el admin puede editarlo manualmente desde la UI.
- **RLS con is_active** → Mitigation: actualizar todas las políticas existentes para incluir `and profiles.is_active = true` en los checks relevantes. Testear con usuario inactivo antes de desplegar.

## Migration Plan

1. Ejecutar migración SQL `003_user_management.sql` (añade `is_active`, actualiza RLS).
2. Desplegar Edge Function `admin-create-user` con `supabase functions deploy`.
3. Configurar secret `SUPABASE_SERVICE_ROLE_KEY` en el entorno de Edge Functions.
4. Deploy del frontend.

**Rollback**: revertir la migración SQL (eliminar columna `is_active`, restaurar policies), eliminar la Edge Function.
