## Requirements

### Requirement: Crear usuario desde la app
Un `admin-it` SHALL poder crear un nuevo usuario proporcionando nombre, email, contraseña temporal y rol inicial, sin necesidad de acceder al Dashboard de Supabase.

#### Scenario: Creación exitosa de usuario
- **WHEN** el admin rellena el formulario con nombre, email válido, contraseña y rol, y confirma
- **THEN** el sistema llama a la Edge Function `admin-create-user`, se crea la cuenta en Supabase Auth, se genera el perfil con los datos indicados, y el nuevo usuario aparece en la tabla de usuarios

#### Scenario: Email ya existente
- **WHEN** el admin intenta crear un usuario con un email que ya está registrado
- **THEN** el sistema muestra un error indicando que el email ya está en uso y no crea duplicados

#### Scenario: Contraseña demasiado corta
- **WHEN** el admin introduce una contraseña de menos de 8 caracteres
- **THEN** el sistema muestra un error de validación antes de llamar a la Edge Function

#### Scenario: Acceso no autorizado a la Edge Function
- **WHEN** un usuario con rol `user` o `technician` llama directamente a la Edge Function
- **THEN** la función responde con HTTP 403 y no crea ningún usuario

### Requirement: Editar datos de perfil
Un `admin-it` SHALL poder editar el nombre, email y rol de cualquier perfil de usuario desde la interfaz web.

#### Scenario: Edición de nombre exitosa
- **WHEN** el admin modifica el nombre de un usuario y guarda
- **THEN** el sistema actualiza el campo `name` en `profiles` y el cambio se refleja inmediatamente en la tabla

#### Scenario: Cambio de rol efectivo
- **WHEN** el admin cambia el rol de un usuario de `user` a `technician`
- **THEN** el sistema actualiza `profiles.role` y en la siguiente petición del usuario afectado las políticas RLS reflejan el nuevo rol

#### Scenario: Cambio de email
- **WHEN** el admin modifica el email de un usuario
- **THEN** el sistema actualiza tanto `profiles.email` como el email en `auth.users` vía Edge Function

### Requirement: Desactivar y reactivar usuario
Un `admin-it` SHALL poder desactivar un usuario, impidiendo su acceso a la aplicación sin borrar sus datos, y reactivarlo posteriormente.

#### Scenario: Desactivación de usuario
- **WHEN** el admin desactiva un usuario activo
- **THEN** el sistema establece `profiles.is_active = false` y el usuario no puede iniciar sesión ni acceder a recursos protegidos

#### Scenario: Reactivación de usuario
- **WHEN** el admin reactiva un usuario inactivo
- **THEN** el sistema establece `profiles.is_active = true` y el usuario recupera el acceso según su rol

#### Scenario: Admin no puede desactivarse a sí mismo
- **WHEN** el admin intenta desactivar su propio perfil
- **THEN** el sistema muestra un error y no realiza el cambio

### Requirement: Listar usuarios con búsqueda y filtro
La página de gestión SHALL mostrar todos los perfiles con capacidad de buscar por nombre/email y filtrar por rol y estado.

#### Scenario: Búsqueda por nombre
- **WHEN** el admin escribe en el campo de búsqueda
- **THEN** la tabla filtra mostrando solo usuarios cuyo nombre o email contenga el término buscado

#### Scenario: Filtro por rol
- **WHEN** el admin selecciona un rol en el filtro
- **THEN** la tabla muestra solo usuarios con ese rol
