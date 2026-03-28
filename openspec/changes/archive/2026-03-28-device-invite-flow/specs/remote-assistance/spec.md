## ADDED Requirements

### Requirement: Iniciar sesión remota con invite vinculado
Un admin-it SHALL poder generar un link de invitación que, al ser aceptado, inicie automáticamente una sesión de asistencia remota con el dispositivo recién registrado.

#### Scenario: Sesión iniciada automáticamente tras aceptar invite
- **WHEN** el invite tiene un `session_id` y el usuario acepta
- **THEN** el sistema asocia el dispositivo recién registrado a esa sesión y redirige al usuario a `/remote/:session_id` sin pasos adicionales

#### Scenario: Admin ve la sesión pasar a pendiente
- **WHEN** el usuario acepta el invite con sesión vinculada
- **THEN** el admin ve la sesión actualizada en tiempo real en su vista de dispositivos o sesión activa
