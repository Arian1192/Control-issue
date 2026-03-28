## Requirements

### Requirement: Registrar dispositivo
Un usuario SHALL poder registrar su dispositivo (ordenador) en el sistema para que pueda recibir solicitudes de asistencia remota. Al registrar o durante el heartbeat, el cliente SHALL detectar automáticamente su IP local y almacenarla en `devices.ip_local`. El propietario SHALL poder eliminar o renombrar sus dispositivos (ver capability `device-management`). Los dispositivos se ordenan por `created_at DESC`.

#### Scenario: Registro de dispositivo nuevo
- **WHEN** el usuario accede a la sección "Mis dispositivos" y añade un dispositivo con nombre
- **THEN** el sistema crea un registro en `devices` asociado al usuario con `created_at = now()` y muestra el estado `offline` hasta que el dispositivo envíe su primer heartbeat

#### Scenario: Detección de dispositivo en línea
- **WHEN** el dispositivo establece una conexión activa con el backend (heartbeat vía Supabase Realtime)
- **THEN** el sistema actualiza `is_online = true`, `last_seen` e `ip_local` (IP LAN detectada vía WebRTC STUN) en tiempo real

#### Scenario: Detección de IP local
- **WHEN** el cliente realiza el heartbeat y la detección STUN devuelve un candidate de tipo `host`
- **THEN** el sistema almacena la primera IP LAN encontrada en `devices.ip_local` y la muestra en la tarjeta del dispositivo

### Requirement: Solicitar sesión de asistencia remota
Un técnico o admin SHALL poder solicitar una sesión de asistencia remota a un dispositivo registrado, vinculada opcionalmente a una incidencia.

#### Scenario: Solicitud desde una incidencia
- **WHEN** un técnico pulsa "Iniciar asistencia remota" en una incidencia con un dispositivo asociado
- **THEN** el sistema crea un registro en `remote_sessions` con estado `pendiente` y notifica al propietario del dispositivo

#### Scenario: Solicitud a dispositivo offline
- **WHEN** el técnico intenta iniciar una sesión en un dispositivo con `is_online = false`
- **THEN** el sistema muestra un aviso indicando que el dispositivo no está disponible y no crea la sesión

### Requirement: Aceptar o rechazar sesión de asistencia
El propietario del dispositivo SHALL recibir una notificación y poder aceptar o rechazar la sesión de asistencia remota.

#### Scenario: Propietario acepta la sesión
- **WHEN** el propietario pulsa "Aceptar" en la notificación de solicitud
- **THEN** el sistema actualiza el estado de la sesión a `activa` e inicia el flujo WebRTC de compartición de pantalla

#### Scenario: Propietario rechaza la sesión
- **WHEN** el propietario pulsa "Rechazar"
- **THEN** el sistema actualiza el estado a `rechazada` y notifica al técnico solicitante

### Requirement: Compartir pantalla vía WebRTC
El sistema SHALL establecer una sesión WebRTC de compartición de pantalla (`getDisplayMedia`) entre el técnico (viewer) y el dispositivo del usuario (sharer), tanto en red local como en red externa. Es el propietario del dispositivo quien llama a `getDisplayMedia()` y envía el offer; el técnico recibe el stream de video.

#### Scenario: Usuario es el sharer — inicia getDisplayMedia al aceptar
- **WHEN** el propietario del dispositivo acepta la sesión
- **THEN** el sistema llama a `getDisplayMedia()` en el browser del usuario, crea una `RTCPeerConnection`, añade los tracks del stream, genera un offer y lo envía al técnico vía el canal de señalización

#### Scenario: Técnico es el viewer — recibe el stream
- **WHEN** el técnico tiene la sesión en `status='activa'` y recibe el offer del usuario
- **THEN** el sistema crea una `RTCPeerConnection` en el browser del técnico, procesa el offer, genera un answer, y el stream del usuario aparece en el elemento `<video>` del técnico

#### Scenario: Conexión exitosa en LAN
- **WHEN** ambas partes están en la misma red local y la sesión es aceptada
- **THEN** el sistema establece una conexión WebRTC peer-to-peer y el técnico visualiza la pantalla del usuario en menos de 5 segundos

#### Scenario: Conexión exitosa fuera de LAN (TURN)
- **WHEN** las partes están en redes diferentes y los ICE candidates directos fallan
- **THEN** el sistema redirige el tráfico a través del servidor TURN configurado vía variables de entorno y la sesión se establece correctamente

#### Scenario: Fallo de conexión
- **WHEN** la negociación WebRTC no logra establecer conexión en 30 segundos
- **THEN** el sistema marca la sesión como `fallida`, informa a ambas partes y registra el error

### Requirement: Notificación in-app de sesión pendiente
El sistema SHALL notificar al propietario del dispositivo en tiempo real cuando un técnico o admin crea una sesión de asistencia remota con `status='pendiente'` dirigida a uno de sus dispositivos.

#### Scenario: Usuario recibe notificación mientras está en la app
- **WHEN** un técnico crea una sesión con `status='pendiente'` para un dispositivo del usuario
- **THEN** el sistema muestra un banner en la UI del usuario con el nombre del dispositivo y botones "Aceptar" y "Rechazar" sin necesidad de recargar la página

#### Scenario: Usuario ignora la notificación
- **WHEN** el usuario cierra la notificación sin aceptar ni rechazar
- **THEN** la sesión permanece en `status='pendiente'` y el técnico puede cancelarla manualmente

### Requirement: Vista de espera para el técnico
El sistema SHALL mostrar al técnico una pantalla de espera mientras la sesión está en `status='pendiente'`.

#### Scenario: Técnico espera aceptación
- **WHEN** el técnico navega a `/remote/:sessionId` con `status='pendiente'`
- **THEN** el sistema muestra el mensaje "Esperando que el usuario acepte la sesión..." sin el `<video>` activo

#### Scenario: Sesión pasa a activa
- **WHEN** el usuario acepta la sesión y `status` cambia a `activa`
- **THEN** el sistema actualiza la UI del técnico en tiempo real y comienza a recibir el stream de video

### Requirement: Auditoría de sesiones remotas para admin-it
El admin-it SHALL poder consultar un historial de sesiones remotas finalizadas, rechazadas o fallidas.

#### Scenario: Admin ve historial de sesiones
- **WHEN** el admin-it accede a la sección de auditoría en el panel de administración
- **THEN** el sistema muestra una lista con dispositivo, técnico solicitante, incidencia vinculada (si existe), estado final y duración de cada sesión, ordenada por fecha descendente

### Requirement: Chat en tiempo real durante la sesión
El sistema SHALL proporcionar un canal de chat de texto entre técnico y usuario durante una sesión de asistencia activa.

#### Scenario: Envío de mensaje durante sesión
- **WHEN** cualquiera de las partes escribe un mensaje en el chat de sesión
- **THEN** el mensaje aparece en tiempo real para ambas partes con nombre del remitente y timestamp

### Requirement: Finalizar sesión de asistencia
Cualquiera de las partes SHALL poder finalizar la sesión de asistencia remota en cualquier momento.

#### Scenario: Técnico finaliza la sesión
- **WHEN** el técnico pulsa "Finalizar sesión"
- **THEN** el sistema cierra la conexión WebRTC, actualiza el estado de la sesión a `finalizada` y registra `ended_at`

#### Scenario: Usuario cierra la compartición de pantalla desde el SO
- **WHEN** el usuario revoca el permiso de `getDisplayMedia` desde su sistema operativo o navegador
- **THEN** el sistema detecta el fin del stream, cierra la sesión limpiamente y notifica al técnico

### Requirement: Iniciar sesión remota con invite vinculado
Un admin-it SHALL poder generar un link de invitación que, al ser aceptado, inicie automáticamente una sesión de asistencia remota con el dispositivo recién registrado.

#### Scenario: Sesión iniciada automáticamente tras aceptar invite
- **WHEN** el invite tiene un `session_id` y el usuario acepta
- **THEN** el sistema asocia el dispositivo recién registrado a esa sesión y redirige al usuario a `/remote/:session_id` sin pasos adicionales

#### Scenario: Admin ve la sesión pasar a pendiente
- **WHEN** el usuario acepta el invite con sesión vinculada
- **THEN** el admin ve la sesión actualizada en tiempo real en su vista de dispositivos o sesión activa
