## Requirements

### Requirement: Registrar dispositivo
Un usuario SHALL poder registrar su dispositivo (ordenador) en el sistema para recibir solicitudes de asistencia remota. Al registrar o durante el heartbeat, el cliente SHALL detectar automáticamente su IP local y almacenarla en `devices.ip_local`.

#### Scenario: Registro de dispositivo nuevo
- **WHEN** el usuario añade un dispositivo con nombre en "Mis dispositivos"
- **THEN** el sistema crea un registro en `devices` asociado al usuario con `created_at = now()` y estado inicial `offline`

#### Scenario: Detección de dispositivo en línea
- **WHEN** el dispositivo mantiene heartbeat activo vía Supabase Realtime
- **THEN** el sistema actualiza `is_online = true`, `last_seen` e `ip_local` en tiempo real

### Requirement: Solicitar sesión de asistencia remota
Un técnico o admin SHALL poder solicitar una sesión de asistencia remota a un dispositivo registrado, vinculada opcionalmente a una incidencia.

#### Scenario: Solicitud desde una incidencia
- **WHEN** el técnico pulsa "Iniciar asistencia remota" en una incidencia
- **THEN** el sistema crea un registro en `remote_sessions` con estado `pendiente` y notifica al propietario del dispositivo

#### Scenario: Solicitud a dispositivo offline
- **WHEN** el técnico intenta iniciar una sesión sobre un dispositivo `is_online = false`
- **THEN** el sistema muestra un recovery path claro y permite generar un link `/invite/:token` para que el usuario autorice el equipo desde el que necesita ayuda

#### Scenario: Solicitud sin dispositivos registrados
- **WHEN** el técnico intenta iniciar asistencia y el usuario no tiene dispositivos
- **THEN** el sistema permite generar un link `/invite/:token` asociado a la incidencia para registrar el equipo y continuar el flujo remoto

### Requirement: Una sola sesión abierta por dispositivo
El sistema SHALL impedir más de una sesión abierta por dispositivo (`pendiente`, `aceptada`, `activa`).

#### Scenario: Colisión por doble click o concurrencia
- **WHEN** dos solicitudes compiten sobre el mismo `target_device_id`
- **THEN** la app usa `create_or_get_open_remote_session(...)` para resolverlo de forma atómica y devolver la sesión abierta existente o crear una nueva

### Requirement: Aceptar o rechazar sesión
El propietario del dispositivo SHALL poder aceptar o rechazar la solicitud.

#### Scenario: Propietario acepta
- **WHEN** el propietario pulsa "Aceptar"
- **THEN** el sistema actualiza estado a `aceptada`, define `accepted_at` y pasa `connection_phase='awaiting-rustdesk-install'`

#### Scenario: Propietario rechaza
- **WHEN** el propietario pulsa "Rechazar"
- **THEN** el sistema actualiza estado a `rechazada`, registra `ended_at` y notifica al técnico

### Requirement: Handoff RustDesk dentro de la sesión
La app SHALL coordinar el handoff hacia RustDesk sin transportar directamente el video remoto.

#### Scenario: Usuario comparte credenciales RustDesk
- **WHEN** el usuario carga su `rustdesk_id` (y opcional `rustdesk_password`) en la sesión aceptada
- **THEN** el sistema guarda `rustdesk_id`, `rustdesk_password`, `rustdesk_ready_at` y `rustdesk_platform` en `remote_sessions`

#### Scenario: Técnico recibe datos en tiempo real
- **WHEN** el usuario publica sus datos de RustDesk
- **THEN** el técnico ve esos datos en `/remote/:sessionId` sin recargar, el sistema guarda `connection_phase='ready-for-technician'` y el técnico puede copiarlos para conectar

### Requirement: Inicio de sesión en curso por técnico
El técnico SHALL poder marcar la sesión como activa cuando inicia la conexión en RustDesk.

#### Scenario: Marcar sesión en curso
- **WHEN** el técnico pulsa "Marcar sesión en curso" con `rustdesk_id` presente
- **THEN** el sistema actualiza estado a `activa`, define `started_at` y `connection_phase='active'`

### Requirement: Notificación in-app de sesión pendiente
El sistema SHALL notificar en tiempo real al propietario del dispositivo cuando se crea una sesión `pendiente` dirigida a uno de sus dispositivos.

#### Scenario: Usuario recibe notificación
- **WHEN** se crea una sesión `pendiente` para su dispositivo
- **THEN** el sistema muestra banner con acciones de aceptar/rechazar sin recarga

### Requirement: Finalizar sesión de asistencia
Cualquiera de las partes SHALL poder finalizar la sesión en cualquier momento.

#### Scenario: Finalización manual
- **WHEN** técnico o usuario pulsa "Finalizar sesión"
- **THEN** el sistema actualiza estado a `finalizada`, registra `ended_at` y limpia credenciales sensibles temporales (`rustdesk_password`)

### Requirement: Iniciar asistencia remota con invite vinculado
Un admin-it o technician SHALL poder generar un invite que permita registrar el equipo y continuar la asistencia remota desde una incidencia.

#### Scenario: Invite con sesión remota ya asociada
- **WHEN** el invite incluye `session_id` y el usuario lo acepta
- **THEN** la app asocia el nuevo dispositivo a esa sesión y redirige a `/remote/:session_id`

#### Scenario: Invite vinculado a incidencia sin dispositivo previo
- **WHEN** el invite incluye `issue_id` y el usuario autoriza el equipo
- **THEN** la app registra el dispositivo, crea o recupera la `remote_session` correspondiente y redirige a `/remote/:sessionId`
