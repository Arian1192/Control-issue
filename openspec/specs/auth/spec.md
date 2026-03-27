## Requirements

### Requirement: Registro e inicio de sesión
El sistema SHALL permitir a los usuarios autenticarse mediante email y contraseña usando Supabase Auth.

#### Scenario: Registro exitoso
- **WHEN** un nuevo usuario proporciona un email válido y una contraseña de al menos 8 caracteres
- **THEN** Supabase Auth crea la cuenta, se genera un perfil en `profiles` con rol `user` por defecto, y el usuario queda autenticado

#### Scenario: Inicio de sesión exitoso
- **WHEN** un usuario registrado introduce su email y contraseña correctos
- **THEN** el sistema devuelve una sesión activa y redirige al dashboard

#### Scenario: Credenciales incorrectas
- **WHEN** el usuario introduce una contraseña errónea
- **THEN** el sistema muestra un mensaje de error genérico sin revelar si el email existe

### Requirement: Gestión de roles
El sistema SHALL asignar y aplicar roles diferenciados: `admin-it`, `technician` y `user`.

#### Scenario: Asignación de rol por defecto
- **WHEN** se crea un nuevo perfil tras registro
- **THEN** el campo `role` en `profiles` se establece como `user`

#### Scenario: Cambio de rol por admin
- **WHEN** un `admin-it` cambia el rol de un perfil a `technician`
- **THEN** el sistema actualiza el campo `role` y los permisos RLS se aplican inmediatamente en la siguiente petición

### Requirement: Protección de rutas por rol
El sistema SHALL redirigir a los usuarios que accedan a rutas no autorizadas para su rol.

#### Scenario: Usuario accede a ruta de admin
- **WHEN** un usuario con rol `user` navega a `/admin`
- **THEN** el sistema redirige a `/` y muestra un mensaje de acceso denegado

#### Scenario: Acceso no autenticado a ruta protegida
- **WHEN** un visitante no autenticado intenta acceder a cualquier ruta de la aplicación
- **THEN** el sistema redirige a la página de inicio de sesión

### Requirement: Cierre de sesión
El sistema SHALL permitir al usuario cerrar sesión, invalidando su token de acceso.

#### Scenario: Cierre de sesión exitoso
- **WHEN** el usuario pulsa "Cerrar sesión"
- **THEN** Supabase Auth invalida la sesión, se limpia el estado local y el usuario es redirigido a la página de login

### Requirement: Políticas RLS en Supabase
El sistema SHALL aplicar Row Level Security en todas las tablas sensibles para que los datos de cada usuario solo sean accesibles según su rol.

#### Scenario: Usuario no puede leer incidencias de otros
- **WHEN** un usuario con rol `user` realiza una consulta a la tabla `issues`
- **THEN** Supabase RLS filtra los resultados devolviendo solo las incidencias donde `created_by = auth.uid()`

#### Scenario: Técnico accede a incidencias asignadas
- **WHEN** un usuario con rol `technician` consulta `issues`
- **THEN** RLS devuelve las incidencias donde `assigned_to = auth.uid()` o creadas por él
