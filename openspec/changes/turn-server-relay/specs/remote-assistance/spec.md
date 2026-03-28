## MODIFIED Requirements

### Requirement: Compartir pantalla vía WebRTC
El sistema SHALL establecer una sesión WebRTC de compartición de pantalla (`getDisplayMedia`) entre el técnico (viewer) y el dispositivo del usuario (sharer), tanto en red local como en red externa. Es el propietario del dispositivo quien llama a `getDisplayMedia()` y envía el offer; el técnico recibe el stream de video. Antes de crear la `RTCPeerConnection`, el sistema SHALL obtener credenciales TURN efímeras del servidor para garantizar conectividad fuera de LAN.

#### Scenario: Usuario es el sharer — inicia getDisplayMedia al aceptar
- **WHEN** el propietario del dispositivo acepta la sesión
- **THEN** el sistema llama a `getDisplayMedia()` en el browser del usuario, obtiene credenciales TURN del servidor, crea una `RTCPeerConnection` con los ICE servers (STUN + TURN), añade los tracks del stream, genera un offer y lo envía al técnico vía el canal de señalización

#### Scenario: Técnico es el viewer — recibe el stream
- **WHEN** el técnico tiene la sesión en `status='activa'` y recibe el offer del usuario
- **THEN** el sistema obtiene credenciales TURN del servidor, crea una `RTCPeerConnection` con los ICE servers (STUN + TURN), procesa el offer, genera un answer, y el stream del usuario aparece en el elemento `<video>` del técnico

#### Scenario: Conexión exitosa en LAN
- **WHEN** ambas partes están en la misma red local y la sesión es aceptada
- **THEN** el sistema establece una conexión WebRTC peer-to-peer y el técnico visualiza la pantalla del usuario en menos de 5 segundos

#### Scenario: Conexión exitosa fuera de LAN (TURN)
- **WHEN** las partes están en redes diferentes y los ICE candidates directos fallan
- **THEN** el sistema usa el servidor TURN como relay con credenciales HMAC-SHA1 generadas en el servidor, y la sesión se establece correctamente sin importar el NAT o la red de cada parte

#### Scenario: Fallback a solo-STUN si TURN no disponible
- **WHEN** la Edge Function `get-turn-credentials` no está configurada o responde con error
- **THEN** el sistema continúa con solo el servidor STUN como ICE server y registra un warning, sin bloquear el inicio de la sesión

#### Scenario: Fallo de conexión
- **WHEN** la negociación WebRTC no logra establecer conexión en 30 segundos
- **THEN** el sistema marca la sesión como `fallida`, informa a ambas partes y registra el error
