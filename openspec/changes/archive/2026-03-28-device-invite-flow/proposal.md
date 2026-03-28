## Why

Hoy un usuario tiene que saber que existe la sección "Mis dispositivos", entrar, escribir un nombre y registrar su equipo manualmente — antes de que el IT pueda ayudarle. Esto supone una fricción enorme para perfiles no técnicos: no saben qué es un "dispositivo" en el sistema, no entienden por qué tienen que hacer ese paso, y probablemente abandonen antes de completarlo.

El flujo ideal es el inverso: el IT-Admin inicia el proceso, el usuario solo recibe un link y aprieta un botón.

## What Changes

- **Link de invitación generado por el IT-Admin**: desde `DevicesPage` (sección "Dispositivos de usuarios"), el admin genera un link único de invitación para un usuario específico. El link tiene expiración (24 horas).
- **Página de aceptación para usuarios no técnicos** (`/invite/:token`): página pública, sin login previo requerido. Muestra un mensaje claro en lenguaje natural: *"Tu equipo de soporte quiere conectarse a tu ordenador para ayudarte. Haz click en 'Autorizar' para continuar."* Al aceptar, la app registra el dispositivo automáticamente e inicia la sesión.
- **Registro automático del dispositivo**: si el usuario no tiene el equipo registrado, se crea el dispositivo en `devices` con nombre inferido del `navigator.userAgent` (p.ej. `"MacBook de María"`) sin que el usuario tenga que escribir nada.
- **Migración `008_device_invites.sql`**: nueva tabla `device_invites` con `token` (UUID), `invited_by`, `invited_user_id`, `expires_at`, `used_at` y `device_id` (FK a `devices`, nullable hasta que se usa).
- **Flujo post-aceptación**: tras registrar el dispositivo, el usuario es redirigido a `/remote/:sessionId` (si hay una sesión pendiente) o a `/devices` con un mensaje de confirmación.

## Capabilities

### New Capabilities

- `device-invite`: Generación de links de invitación por el IT-Admin y aceptación guiada por el usuario, con registro automático del dispositivo.

### Modified Capabilities

- `device-management`: El registro de dispositivo se puede hacer también vía invitación (no solo manualmente desde "Mis dispositivos").
- `remote-assistance`: El inicio de una sesión remota puede partir de un invite link en lugar de requerir que el dispositivo ya esté registrado.

## Impact

- **Base de datos**: nueva migración `008_device_invites.sql` con tabla `device_invites` y RLS.
- **Frontend**: nueva ruta pública `/invite/:token` (`InvitePage.tsx`); `DevicesPage.tsx` con botón "Invitar equipo" para admin-it.
- **Auth**: la página `/invite/:token` require que el usuario esté logueado (redirect a login si no lo está, luego vuelve al invite). Sin login anónimo.
- Sin cambios en WebRTC ni en el modelo de sesiones remotas.
