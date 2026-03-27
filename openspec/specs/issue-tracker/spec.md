## Requirements

### Requirement: Crear incidencia
Un usuario autenticado SHALL poder crear una nueva incidencia proporcionando título, descripción y nivel de prioridad.

#### Scenario: Creación exitosa de incidencia
- **WHEN** un usuario rellena el formulario con título, descripción y prioridad y confirma
- **THEN** el sistema crea la incidencia con estado `abierto`, la asocia al usuario creador y la muestra en la lista de incidencias del usuario

#### Scenario: Validación de campos obligatorios
- **WHEN** el usuario intenta crear una incidencia sin título
- **THEN** el sistema muestra un error de validación y no persiste la incidencia

### Requirement: Listar incidencias
El sistema SHALL mostrar a cada rol la lista de incidencias que le corresponde: usuarios ven solo las suyas, técnicos ven las asignadas, admins ven todas.

#### Scenario: Usuario ve solo sus incidencias
- **WHEN** un usuario con rol `user` accede a la lista de incidencias
- **THEN** el sistema muestra únicamente las incidencias creadas por ese usuario

#### Scenario: Admin ve todas las incidencias
- **WHEN** un usuario con rol `admin-it` accede a la lista de incidencias
- **THEN** el sistema muestra todas las incidencias de la organización

### Requirement: Actualizar estado de incidencia
Un técnico o admin SHALL poder cambiar el estado de una incidencia entre `abierto`, `en-progreso`, `resuelto` y `cerrado`.

#### Scenario: Técnico cierra una incidencia resuelta
- **WHEN** un técnico marca una incidencia como `resuelto`
- **THEN** el sistema actualiza el estado, registra la fecha de resolución y notifica al creador vía Supabase Realtime

#### Scenario: Usuario no puede cambiar el estado
- **WHEN** un usuario con rol `user` intenta cambiar el estado de una incidencia
- **THEN** el sistema rechaza la acción con error de permisos

### Requirement: Asignar incidencia a técnico
Un admin SHALL poder asignar una incidencia abierta a un técnico disponible.

#### Scenario: Asignación exitosa
- **WHEN** un admin selecciona un técnico en el campo `assigned_to` de una incidencia
- **THEN** el sistema actualiza el campo, cambia el estado a `en-progreso` si estaba `abierto`, y el técnico ve la incidencia en su cola

### Requirement: Comentar incidencia
Cualquier participante de la incidencia (creador, técnico asignado, admin) SHALL poder añadir comentarios de texto.

#### Scenario: Añadir comentario
- **WHEN** un participante escribe un comentario y lo envía
- **THEN** el sistema persiste el comentario con autor y timestamp, y lo muestra en el hilo de la incidencia en tiempo real

### Requirement: Adjuntar archivo a incidencia
El creador o el técnico asignado SHALL poder adjuntar archivos (imágenes, logs) a una incidencia, con un límite de 5 MB por archivo.

#### Scenario: Adjunto válido
- **WHEN** el usuario sube un archivo de menos de 5 MB con tipo MIME permitido
- **THEN** el sistema lo almacena en Supabase Storage y muestra el enlace en la incidencia

#### Scenario: Adjunto supera el límite
- **WHEN** el usuario intenta subir un archivo mayor de 5 MB
- **THEN** el sistema rechaza la subida y muestra un mensaje de error con el límite permitido

### Requirement: Filtrar y buscar incidencias
El sistema SHALL permitir filtrar la lista por estado, prioridad y técnico asignado, y buscar por texto en título y descripción.

#### Scenario: Filtro por estado
- **WHEN** el usuario selecciona el filtro `en-progreso`
- **THEN** la lista muestra solo incidencias con ese estado

#### Scenario: Búsqueda por texto
- **WHEN** el usuario escribe un término en el campo de búsqueda
- **THEN** el sistema muestra incidencias cuyo título o descripción contengan ese término (insensible a mayúsculas)
