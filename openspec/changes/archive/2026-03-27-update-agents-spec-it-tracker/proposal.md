## Why

El proyecto `Control-issue` necesita una especificación de agentes clara que refleje el stack tecnológico elegido y los objetivos de la aplicación: una herramienta para que el encargado de IT pueda centralizar el seguimiento de incidencias de la empresa y brindar asistencia remota a ordenadores tanto dentro como fuera de la red local.

## What Changes

- Actualizar `openspec/specs/AGENTS.md` con las instrucciones y contexto específicos del proyecto: stack (Vite + React + Tailwind + ShadCN + Supabase), arquitectura de módulos y patrones de calidad esperados.
- Introducir la capacidad `issue-tracker`: gestión completa del ciclo de vida de incidencias IT (creación, asignación, estados, prioridad, comentarios, historial).
- Introducir la capacidad `remote-assistance`: módulo para que el agente de IT pueda iniciar sesiones de asistencia remota (tanto en red local vía WebRTC/LAN como fuera de la red vía relay/STUN/TURN), incluyendo chat en tiempo real y transferencia de estado de sesión.
- Introducir la capacidad `auth`: autenticación y roles mediante Supabase Auth (admin IT, técnico, usuario final).
- Introducir la capacidad `dashboard`: vista principal con métricas de issues abiertos, tiempos de resolución y estado de sesiones de asistencia.

## Capabilities

### New Capabilities

- `issue-tracker`: Ciclo de vida completo de incidencias IT — creación por usuarios, asignación a técnicos, estados (abierto/en-progreso/resuelto/cerrado), prioridad, comentarios y adjuntos.
- `remote-assistance`: Inicio y gestión de sesiones de asistencia remota a ordenadores dentro y fuera de la red local, con chat en tiempo real y control de permisos por sesión.
- `auth`: Autenticación con Supabase Auth, roles diferenciados (admin-IT, técnico, usuario), protección de rutas y políticas RLS en Supabase.
- `dashboard`: Panel de control con KPIs en tiempo real: issues por estado, técnico asignado, tiempo medio de resolución, sesiones activas.

### Modified Capabilities

- `agents`: Actualización de `AGENTS.md` para incorporar el stack (Vite + React + Tailwind + ShadCN + Supabase), convenciones de código, estructura de carpetas y reglas de calidad específicas del proyecto.

## Impact

- **Frontend**: Scaffolding con Vite + React + TypeScript, Tailwind CSS, ShadCN/UI como librería de componentes.
- **Backend/DB**: Supabase (PostgreSQL) para base de datos, autenticación, realtime subscriptions y storage para adjuntos.
- **Comunicación remota**: Integración con una librería de acceso remoto (p.ej. noVNC, Apache Guacamole o solución propia WebRTC) para el módulo de asistencia.
- **Seguridad**: Row Level Security (RLS) en Supabase, políticas por rol, comunicación cifrada en sesiones remotas.
- **Dependencias nuevas**: `@supabase/supabase-js`, `shadcn/ui`, `tailwindcss`, `react-router-dom`, librería de WebRTC/remote access.
