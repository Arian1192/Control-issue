## MODIFIED Requirements

### Requirement: Dashboard diferenciado por rol
El sistema SHALL mostrar al `admin-it` un dashboard con KPIs, incidencias recientes, sesiones activas y feed de actividad en tiempo real. A técnicos y usuarios les muestra las secciones relevantes para su rol sin el feed de actividad.

#### Scenario: Admin ve el feed de actividad
- **WHEN** un usuario con rol `admin-it` accede al dashboard
- **THEN** el sistema muestra debajo del grid de KPIs e incidencias un widget de feed de actividad con los últimos eventos de la aplicación

#### Scenario: Técnico no ve el feed de actividad
- **WHEN** un usuario con rol `technician` o `user` accede al dashboard
- **THEN** el sistema no muestra el widget de feed de actividad
