## 1. Base de datos

- [x] 1.1 Crear migración `003_user_management.sql`: añadir columna `is_active boolean default true` a `profiles`
- [x] 1.2 Actualizar política RLS `profiles_select_own`: añadir condición `is_active = true` para bloquear acceso a usuarios inactivos
- [x] 1.3 Actualizar políticas RLS de `issues`, `devices` y `remote_sessions` para excluir usuarios con `is_active = false`
- [x] 1.4 Añadir política `profiles_update_self_inactive`: impedir que un admin se desactive a sí mismo via check en la policy

## 2. Edge Function: admin-create-user

- [x] 2.1 Crear estructura de carpetas `supabase/functions/admin-create-user/`
- [x] 2.2 Implementar `index.ts`: validar JWT del llamante, verificar rol `admin-it` consultando `profiles`
- [x] 2.3 Implementar creación de usuario con `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- [x] 2.4 Actualizar el perfil recién creado con `name` y `role` recibidos en el body
- [x] 2.5 Implementar endpoint de actualización de email: `supabase.auth.admin.updateUserById(id, { email })`
- [x] 2.6 Añadir manejo de errores: email duplicado (409), validación (400), no autorizado (403)
- [x] 2.7 Configurar secret `SUPABASE_SERVICE_ROLE_KEY` con `supabase secrets set`
- [x] 2.8 Desplegar la Edge Function con `supabase functions deploy admin-create-user`

## 3. Frontend: tipos y cliente

- [x] 3.1 Actualizar `src/types/database.ts`: añadir campo `is_active: boolean` a `profiles.Row`
- [x] 3.2 Crear helper `src/lib/edgeFunctions.ts` con función `callAdminCreateUser(payload)` y `callAdminUpdateEmail(userId, email)`

## 4. Frontend: UserManagementPage

- [x] 4.1 Crear `src/features/admin/UserManagementPage.tsx` con tabla de usuarios, búsqueda y filtro por rol/estado
- [x] 4.2 Implementar carga de perfiles con `useEffect` + Supabase query ordenada por nombre
- [x] 4.3 Añadir campo de búsqueda (filtra por nombre/email en cliente)
- [x] 4.4 Añadir selector de filtro por rol y por estado (activo/inactivo)
- [x] 4.5 Mostrar badge de estado activo/inactivo en cada fila

## 5. Frontend: UserFormModal

- [x] 5.1 Crear `src/features/admin/UserFormModal.tsx` con modo `create` y `edit` controlado por prop
- [x] 5.2 Campos del formulario: nombre (texto), email (email), contraseña (solo en modo create), rol (select), activo (checkbox)
- [x] 5.3 Validar: nombre obligatorio, email válido, contraseña mínimo 8 caracteres en modo create
- [x] 5.4 En modo `create`: llamar a `callAdminCreateUser()` de la Edge Function
- [x] 5.5 En modo `edit`: actualizar `profiles` directamente con Supabase client; si cambió el email, llamar a `callAdminUpdateEmail()`
- [x] 5.6 Impedir que el admin desactive su propio perfil: comparar `userId === profile.id` y mostrar error

## 6. Frontend: integración en AdminPage

- [x] 6.1 Añadir tab "Gestión de usuarios" en `AdminPage` que renderiza `UserManagementPage`
- [x] 6.2 Añadir botón "Nuevo usuario" que abre `UserFormModal` en modo `create`
- [x] 6.3 Añadir botones de acción por fila: "Editar" (abre modal en modo `edit`) y "Desactivar/Activar"
- [x] 6.4 Actualizar ruta `/admin` en el router para dar acceso a la nueva sub-sección

## 7. Seguridad y cierre

- [x] 7.1 Verificar que `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún archivo de `src/`
- [x] 7.2 Añadir la ruta `/admin` a `RoleGuard` con `allowedRoles: ['admin-it']` (ya existe, verificar)
- [x] 7.3 Detectar `is_active = false` en `AuthProvider` al cargar el perfil y hacer `signOut()` automático
- [x] 7.4 Ejecutar `tsc --noEmit` y corregir errores de tipos
