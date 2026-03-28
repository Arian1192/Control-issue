## Requirements

### Requirement: Eliminar dispositivo propio
El propietario de un dispositivo SHALL poder eliminarlo desde `DevicesPage`, siempre que no tenga sesiones remotas abiertas.

#### Scenario: Eliminación exitosa
- **WHEN** el propietario pulsa "Eliminar" en un dispositivo sin sesiones abiertas
- **THEN** el sistema elimina el registro de `devices` y lo retira del listado en tiempo real

#### Scenario: Intento de eliminación con sesión abierta
- **WHEN** el propietario pulsa "Eliminar" en un dispositivo con una sesión en estado `pendiente`, `aceptada` o `activa`
- **THEN** el sistema muestra un mensaje de error indicando que el dispositivo tiene una sesión en curso y no realiza la eliminación

### Requirement: Renombrar dispositivo propio
El propietario SHALL poder editar el nombre de un dispositivo existente desde `DevicesPage`.

#### Scenario: Rename inline exitoso
- **WHEN** el propietario activa la edición del nombre (doble click o icono de lápiz) e introduce un nuevo nombre válido
- **THEN** el sistema persiste el nuevo nombre en `devices.name` y lo muestra actualizado en la tarjeta

#### Scenario: Nombre en blanco rechazado
- **WHEN** el propietario intenta guardar un nombre vacío o solo espacios
- **THEN** el sistema descarta el cambio y restaura el nombre anterior sin mostrar error

### Requirement: Ordenar dispositivos por fecha de registro
El listado de dispositivos propios SHALL mostrarse ordenado por `created_at DESC` para que los más recientes aparezcan primero.

#### Scenario: Listado con múltiples dispositivos
- **WHEN** el propietario tiene más de un dispositivo registrado
- **THEN** los dispositivos se muestran ordenados del más reciente al más antiguo

### Requirement: Registro de dispositivo vía invitación
El sistema SHALL permitir que un dispositivo sea registrado automáticamente cuando el usuario acepta un link de invitación, sin que el usuario tenga que escribir un nombre ni navegar a "Mis dispositivos".

#### Scenario: Nombre inferido del user-agent
- **WHEN** el usuario acepta el invite y no tiene un nombre explícito para el dispositivo
- **THEN** el sistema genera un nombre a partir del SO detectado en `navigator.userAgent` y el nombre del usuario (ej. "Mac de María", "Windows de Juan")

#### Scenario: Dispositivo ya existente del mismo usuario
- **WHEN** el usuario ya tiene un dispositivo registrado para ese equipo (misma IP o userAgent)
- **THEN** el sistema reutiliza el dispositivo existente en lugar de crear uno duplicado
