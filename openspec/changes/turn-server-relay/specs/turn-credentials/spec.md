## ADDED Requirements

### Requirement: Generar credenciales TURN efímeras
El sistema SHALL exponer un endpoint serverless que genere credenciales TURN de corta duración usando HMAC-SHA1, de forma que ninguna credencial permanente quede expuesta en el cliente.

#### Scenario: Usuario autenticado solicita credenciales
- **WHEN** un usuario autenticado llama a la Edge Function `get-turn-credentials` con su JWT de Supabase
- **THEN** el sistema valida el JWT, genera un `username` con formato `{expiryTimestamp}:{userId}` y un `credential` calculado como `HMAC-SHA1(TURN_SECRET, username)` codificado en base64, y devuelve ambos junto con la URL del servidor TURN

#### Scenario: Credenciales con expiración de 1 hora
- **WHEN** el sistema genera credenciales TURN
- **THEN** el `username` contiene un timestamp Unix de expiración igual a `now + 3600 segundos`, y el servidor TURN rechazará esas credenciales pasada esa ventana

#### Scenario: Usuario no autenticado
- **WHEN** se llama a la Edge Function sin JWT válido o con JWT expirado
- **THEN** el sistema responde con HTTP 401 sin generar credenciales

#### Scenario: Secret no configurado
- **WHEN** la variable de entorno `TURN_SECRET` no está definida en la Edge Function
- **THEN** el sistema responde con HTTP 500 y no devuelve credenciales parciales

### Requirement: Despliegue containerizado del stack completo
El sistema SHALL poder desplegarse como un stack Docker con la aplicación frontend y el servidor TURN en el mismo `docker-compose.yml`, de modo que Coolify (o cualquier host con Docker) pueda levantarlo sin configuración manual adicional.

#### Scenario: Stack completo levantado con docker-compose
- **WHEN** se ejecuta `docker compose up` en el repositorio (o Coolify detecta el `docker-compose.yml`)
- **THEN** el servicio `app` sirve el frontend compilado vía Nginx en el puerto 80/443, y el servicio `coturn` escucha en los puertos 3478 UDP/TCP y 5349 TLS para relay TURN

#### Scenario: Variables de entorno por servicio
- **WHEN** el stack se inicializa con las variables definidas en `.env`
- **THEN** el servicio `coturn` usa `TURN_SECRET` y `TURN_REALM` de las variables de entorno, y el servicio `app` recibe las variables `VITE_*` en tiempo de build
