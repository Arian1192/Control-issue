## ADDED Requirements

### Requirement: Registro automático de eventos en activity_log
El sistema SHALL registrar automáticamente en `activity_log` todos los eventos relevantes de la aplicación mediante triggers PostgreSQL, sin intervención del cliente.

#### Scenario: Creación de incidencia registrada
- **WHEN** se inserta una fila en `issues`
- **THEN** el sistema crea una entrada en `activity_log` con `type = 'issue_created'`, `entity_id` = id de la incidencia, y `metadata` con título y prioridad

#### Scenario: Cambio de estado registrado
- **WHEN** se actualiza `issues.status` a un valor distinto
- **THEN** el sistema crea una entrada con `type = 'status_changed'` y `metadata` con `old_status`, `new_status` y título de la incidencia

#### Scenario: Asignación registrada
- **WHEN** se actualiza `issues.assigned_to` a un valor distinto (incluyendo NULL → valor y valor → NULL)
- **THEN** el sistema crea una entrada con `type = 'issue_assigned'` y `metadata` con el nombre del técnico asignado o "Sin asignar"

#### Scenario: Comentario registrado
- **WHEN** se inserta una fila en `issue_comments`
- **THEN** el sistema crea una entrada con `type = 'comment_added'` y `metadata` con un preview del cuerpo (máx. 80 caracteres) y el título de la incidencia

#### Scenario: Adjunto registrado
- **WHEN** se inserta una fila en `issue_attachments`
- **THEN** el sistema crea una entrada con `type = 'attachment_added'` y `metadata` con el nombre del archivo y el título de la incidencia

#### Scenario: Sesión remota iniciada registrada
- **WHEN** se inserta una fila en `remote_sessions`
- **THEN** el sistema crea una entrada con `type = 'session_started'` y `metadata` con el nombre del dispositivo y el título de la incidencia asociada

#### Scenario: Sesión remota finalizada registrada
- **WHEN** se actualiza `remote_sessions.status` a `'finalizada'` o `'rechazada'`
- **THEN** el sistema crea una entrada con `type = 'session_ended'` o `'session_rejected'` respectivamente

#### Scenario: Usuario creado registrado
- **WHEN** se inserta una fila en `profiles` con `is_active = true` después de la creación inicial
- **THEN** el sistema crea una entrada con `type = 'user_created'` y `metadata` con nombre y rol

#### Scenario: Usuario desactivado o reactivado registrado
- **WHEN** se actualiza `profiles.is_active`
- **THEN** el sistema crea una entrada con `type = 'user_deactivated'` o `'user_reactivated'` y `metadata` con nombre y email

### Requirement: Feed de actividad en tiempo real para admin-it
El sistema SHALL mostrar al `admin-it` un feed cronológico inverso de los eventos registrados, actualizado en tiempo real.

#### Scenario: Admin ve el feed al entrar al dashboard
- **WHEN** un usuario con rol `admin-it` accede al dashboard
- **THEN** el sistema muestra el widget de actividad con los últimos 20 eventos ordenados por `created_at` descendente

#### Scenario: Nuevo evento aparece sin recargar
- **WHEN** ocurre un evento en la aplicación mientras el admin tiene el dashboard abierto
- **THEN** el nuevo evento aparece en la cabecera del feed sin necesidad de refrescar la página

#### Scenario: Cargar más eventos
- **WHEN** el admin hace clic en "Cargar más"
- **THEN** el sistema carga los siguientes 20 eventos y los añade al final del feed

### Requirement: Filtrado del feed por categoría
El sistema SHALL permitir filtrar el feed por categoría de evento sin recargar la página.

#### Scenario: Filtro por categoría aplica sobre los eventos cargados
- **WHEN** el admin selecciona una categoría (incidencias, comentarios, sesiones, usuarios)
- **THEN** el feed muestra únicamente los eventos de esa categoría de entre los ya cargados

#### Scenario: Filtro "Todos" restaura la vista completa
- **WHEN** el admin selecciona el filtro "Todos"
- **THEN** el feed vuelve a mostrar todos los eventos sin distinción de categoría

### Requirement: Presentación visual distintiva de eventos
El sistema SHALL presentar cada evento con iconografía, colores y contexto suficientes para identificarlo sin leer el texto completo.

#### Scenario: Icono y color distintivo por tipo
- **WHEN** el feed muestra un evento
- **THEN** cada tipo de evento tiene un icono único y un color de acento diferenciado (rojo para crítico, verde para resuelto, azul para info, etc.)

#### Scenario: Nombres propios en lugar de UUIDs
- **WHEN** un evento involucra un usuario o una incidencia
- **THEN** el feed muestra el nombre del usuario y el título de la incidencia, no sus identificadores

#### Scenario: Timestamp relativo
- **WHEN** el feed muestra un evento
- **THEN** el timestamp se muestra como tiempo relativo ("hace 2m", "hace 1h") y al pasar el cursor muestra la fecha y hora exactas

#### Scenario: Enlace a la entidad
- **WHEN** el admin hace clic en un evento relacionado con una incidencia
- **THEN** el sistema navega directamente al detalle de esa incidencia
