## Requirements

### Requirement: Vista de KPIs de incidencias
El dashboard SHALL mostrar métricas en tiempo real sobre el estado general de las incidencias: total por estado, tiempo medio de resolución y volumen en las últimas 24h.

#### Scenario: Admin ve resumen global
- **WHEN** un `admin-it` accede al dashboard
- **THEN** el sistema muestra tarjetas con: total de issues abiertos, en progreso, resueltos en las últimas 24h y tiempo medio de resolución de la semana

#### Scenario: Técnico ve su carga de trabajo
- **WHEN** un `technician` accede al dashboard
- **THEN** el sistema muestra las incidencias asignadas al técnico ordenadas por prioridad y antigüedad

### Requirement: Lista de sesiones de asistencia activas
El dashboard SHALL mostrar al admin y técnicos las sesiones de asistencia remota activas en ese momento.

#### Scenario: Visualización de sesiones activas
- **WHEN** hay sesiones remotas con estado `activa`
- **THEN** el dashboard las lista con: técnico, dispositivo objetivo, duración y enlace para unirse (si el usuario tiene permisos)

### Requirement: Actualizaciones en tiempo real
Los datos del dashboard SHALL actualizarse automáticamente via Supabase Realtime sin necesidad de recargar la página.

#### Scenario: Nueva incidencia creada
- **WHEN** se crea una nueva incidencia en la base de datos
- **THEN** el contador de issues abiertos en el dashboard se incrementa en tiempo real para todos los admins conectados

#### Scenario: Sesión remota finalizada
- **WHEN** una sesión de asistencia remota cambia a estado `finalizada`
- **THEN** desaparece de la lista de sesiones activas en el dashboard sin necesidad de refrescar

### Requirement: Acceso rápido a incidencias recientes
El dashboard SHALL mostrar las últimas 5 incidencias actualizadas con acceso directo al detalle.

#### Scenario: Navegación rápida desde dashboard
- **WHEN** el usuario hace clic en una incidencia del panel de recientes
- **THEN** el sistema navega al detalle completo de esa incidencia
