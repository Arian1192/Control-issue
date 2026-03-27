## ADDED Requirements

### Requirement: Estado activo/inactivo de usuario
El sistema SHALL soportar un estado `is_active` por usuario que controla el acceso a todos los recursos de la aplicación.

#### Scenario: Usuario inactivo no puede acceder a recursos
- **WHEN** un usuario con `profiles.is_active = false` realiza cualquier consulta a tablas protegidas por RLS
- **THEN** RLS devuelve cero resultados como si el usuario no tuviera sesión activa

#### Scenario: Usuario inactivo es redirigido al login
- **WHEN** un usuario inactivo intenta acceder a la app con una sesión previamente activa
- **THEN** al cargar su perfil el sistema detecta `is_active = false`, cierra la sesión y redirige a `/login` con mensaje de cuenta desactivada

### Requirement: Creación de usuarios por administrador
El sistema SHALL permitir que un `admin-it` cree cuentas de usuario en nombre de otros, usando un canal seguro que no exponga claves privilegiadas al cliente.

#### Scenario: Edge Function valida el rol del llamante
- **WHEN** la Edge Function `admin-create-user` recibe una solicitud
- **THEN** verifica el JWT de la petición y comprueba que `profiles.role = 'admin-it'` antes de proceder

#### Scenario: Nuevo usuario recibe rol asignado
- **WHEN** el admin crea un usuario con rol `technician`
- **THEN** el perfil generado automáticamente tiene `role = 'technician'` y `is_active = true`
