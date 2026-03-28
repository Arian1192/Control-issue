## ADDED Requirements

### Requirement: Registro de dispositivo vía invitación
El sistema SHALL permitir que un dispositivo sea registrado automáticamente cuando el usuario acepta un link de invitación, sin que el usuario tenga que escribir un nombre ni navegar a "Mis dispositivos".

#### Scenario: Nombre inferido del user-agent
- **WHEN** el usuario acepta el invite y no tiene un nombre explícito para el dispositivo
- **THEN** el sistema genera un nombre a partir del SO detectado en `navigator.userAgent` y el nombre del usuario (ej. "Mac de María", "Windows de Juan")

#### Scenario: Dispositivo ya existente del mismo usuario
- **WHEN** el usuario ya tiene un dispositivo registrado para ese equipo (misma IP o userAgent)
- **THEN** el sistema reutiliza el dispositivo existente en lugar de crear uno duplicado
