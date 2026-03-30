## Requirements

### Requirement: Generar link de invitación
Un admin-it o technician SHALL poder generar un link de invitación para un usuario específico desde una incidencia cuando no haya un dispositivo elegible. El link expira en 24 horas y es de un solo uso.

#### Scenario: Soporte genera invite y copia el link
- **WHEN** el admin-it o technician pulsa "Generar enlace de acceso" desde la incidencia
- **THEN** el sistema crea un registro en `device_invites` con token UUID, `invited_user_id`, `issue_id`, `expires_at = now() + 24h` y copia el link `/invite/:token` al portapapeles, mostrando feedback visual "Link copiado"

#### Scenario: Soporte intenta invitar a un usuario sin cuenta
- **WHEN** soporte intenta generar un invite para un usuario inexistente
- **THEN** el sistema muestra un error indicando que el usuario debe tener cuenta antes de recibir una invitación

### Requirement: Aceptar invitación desde link
El usuario SHALL poder abrir el link de invitación en su ordenador y autorizar la conexión con un solo click, sin necesidad de conocer el sistema ni realizar configuración manual.

#### Scenario: Usuario abre el link sin sesión iniciada
- **WHEN** el usuario abre `/invite/:token` sin estar autenticado
- **THEN** el sistema redirige a `/login?redirect=/invite/:token` mostrando el banner "Iniciá sesión para autorizar la conexión con tu soporte técnico"

#### Scenario: Usuario abre el link autenticado y autoriza
- **WHEN** el usuario autenticado abre `/invite/:token` válido y pulsa "Autorizar"
- **THEN** el sistema registra automáticamente el dispositivo en `devices` con nombre inferido del user-agent (ej. "Mac de María"), marca el invite como usado (`used_at = now()`) y redirige al usuario

#### Scenario: Redirección tras autorización con sesión pendiente
- **WHEN** el invite tiene un `session_id` asociado
- **THEN** tras registrar el dispositivo, el sistema redirige al usuario a `/remote/:session_id`

#### Scenario: Redirección tras autorización con incidencia pendiente
- **WHEN** el invite tiene un `issue_id` asociado y todavía no existe `session_id`
- **THEN** tras registrar el dispositivo, el sistema crea o recupera la sesión remota para ese equipo y redirige al usuario a `/remote/:sessionId`

#### Scenario: Redirección tras autorización sin sesión pendiente
- **WHEN** el invite no tiene `session_id`
- **THEN** tras registrar el dispositivo, el sistema redirige al usuario a `/devices` con un mensaje de confirmación "Equipo registrado correctamente"

#### Scenario: Link expirado
- **WHEN** el usuario abre un link cuyo `expires_at` ya pasó
- **THEN** el sistema muestra la página `/invite/:token` con el mensaje "Este link ha caducado. Solicita uno nuevo a tu soporte técnico." sin botón de autorizar

#### Scenario: Link ya usado
- **WHEN** el usuario abre un link con `used_at` no nulo
- **THEN** el sistema muestra "Este link ya fue utilizado. Si necesitás asistencia, contactá a tu soporte técnico."

#### Scenario: Link de otro usuario
- **WHEN** el usuario autenticado abre un link cuyo `invited_user_id` no coincide con su `auth.uid()`
- **THEN** el sistema muestra "Este link de invitación no es para tu cuenta."
