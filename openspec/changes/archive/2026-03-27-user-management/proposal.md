## Why

El panel de administración actual permite cambiar roles de usuarios existentes, pero no hay forma de crear nuevos usuarios desde la propia app ni de editar sus datos de perfil (nombre, email). El `admin-it` depende del Dashboard de Supabase para estas tareas, lo que ralentiza el onboarding de nuevos empleados y la gestión del equipo.

## What Changes

- Añadir una página de gestión de usuarios completa en `/admin/users` accesible solo para `admin-it`.
- Permitir la **creación de nuevos usuarios** con email, contraseña temporal y rol inicial, usando la Supabase Admin API desde una Edge Function (para no exponer la `service_role_key` en el cliente).
- Permitir la **edición de datos de perfil** de cualquier usuario: nombre, email y rol.
- Permitir la **desactivación** (soft-delete) de usuarios: bloquear acceso sin borrar sus datos.
- Mejorar la tabla de usuarios existente en `AdminPage` con acciones inline.

## Capabilities

### New Capabilities

- `user-management`: Creación, edición y desactivación de usuarios por parte del `admin-it` desde la interfaz web.

### Modified Capabilities

- `auth`: Se añade el requisito de que el sistema soporte creación de usuarios iniciada por admin (no solo auto-registro). Se añade estado `activo/inactivo` al perfil.

## Impact

- **Frontend**: Nueva página `UserManagementPage` y modal `UserFormModal` en `src/features/admin/`.
- **Backend**: Nueva Supabase Edge Function `admin-create-user` que usa `service_role_key` de forma segura en servidor.
- **DB**: Añadir campo `is_active boolean` a la tabla `profiles`. Actualizar política RLS para bloquear acceso de usuarios inactivos.
- **Seguridad**: La `service_role_key` nunca llega al cliente; la Edge Function la lee desde variables de entorno del servidor.
