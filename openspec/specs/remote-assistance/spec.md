## Requirements

### Requirement: Registrar dispositivo
Un usuario SHALL poder registrar su dispositivo (ordenador) en el sistema para que pueda recibir solicitudes de asistencia remota.

#### Scenario: Registro de dispositivo nuevo
- **WHEN** el usuario accede a la sección "Mis dispositivos" y añade un dispositivo con nombre
- **THEN** el sistema crea un registro en `devices` asociado al usuario y muestra el estado `offline` hasta que el dispositivo se conecte

#### Scenario: Detección de dispositivo en línea
- **WHEN** el dispositivo establece una conexión activa con el backend (heartbeat vía Supabase Realtime)
- **THEN** el sistema actualiza `is_online = true` y `last_seen` en tiempo real

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
El sistema SHALL establecer una sesión WebRTC de compartición de pantalla (`getDisplayMedia`) entre el técnico y el dispositivo del usuario, tanto en red local como en red externa.

#### Scenario: Conexión exitosa en LAN
- **WHEN** ambas partes están en la misma red local y la sesión es aceptada
- **THEN** el sistema establece una conexión WebRTC peer-to-peer y el técnico visualiza la pantalla del usuario en menos de 5 segundos

#### Scenario: Conexión exitosa fuera de LAN (TURN)
- **WHEN** las partes están en redes diferentes y los ICE candidates directos fallan
- **THEN** el sistema redirige el tráfico a través del servidor TURN y la sesión se establece correctamente

#### Scenario: Fallo de conexión
- **WHEN** la negociación WebRTC no logra establecer conexión en 30 segundos
- **THEN** el sistema marca la sesión como `fallida`, informa a ambas partes y registra el error

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
