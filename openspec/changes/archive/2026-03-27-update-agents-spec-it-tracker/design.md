## Context

`Control-issue` es una aplicación web para el departamento de IT que centraliza el seguimiento de incidencias internas y permite asistencia remota a dispositivos corporativos. El punto de partida es un repositorio vacío con un fichero `AGENTS.md` en blanco. No hay código existente ni base de datos previa.

El stack elegido es:
- **Frontend**: Vite + React (TypeScript) + Tailwind CSS + ShadCN/UI
- **Backend/BaaS**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Acceso remoto**: Integración WebRTC para LAN; relay STUN/TURN para acceso externo

## Goals / Non-Goals

**Goals:**
- Definir la arquitectura de módulos y carpetas del proyecto.
- Establecer el modelo de datos principal en Supabase.
- Decidir la estrategia de acceso remoto (WebRTC vs. solución gestionada).
- Configurar autenticación y roles con Supabase Auth + RLS.
- Sentar las convenciones de código que irán en `AGENTS.md`.

**Non-Goals:**
- Implementar un agente de escritorio instalable en los endpoints (queda para fase 2).
- Internacionalización (i18n) en este primer lanzamiento.
- Integración con sistemas externos de ticketing (Jira, ServiceNow).
- Soporte mobile nativo (solo web responsivo).

## Decisions

### 1. Stack Frontend: Vite + React + Tailwind + ShadCN
**Decisión**: Vite como bundler, React con TypeScript, Tailwind para utilidades CSS y ShadCN/UI como sistema de componentes (basado en Radix UI).
**Alternativas consideradas**: Next.js (descartado: sin necesidad de SSR, complejidad extra), CRA (descartado: deprecado), Material UI (descartado: menos flexible con Tailwind).
**Rationale**: Máxima velocidad de desarrollo, DX moderna, componentes accesibles sin vendor lock-in.

### 2. Backend: Supabase
**Decisión**: Supabase como BaaS — PostgreSQL para datos, Auth para identidad, Realtime para actualizaciones en vivo, Storage para adjuntos.
**Alternativas consideradas**: Firebase (descartado: vendor lock-in fuerte, no SQL), backend custom Node.js (descartado: over-engineering para MVP).
**Rationale**: SQL real, RLS nativo, client JS de primera clase, subscripciones en tiempo real sin infraestructura adicional.

### 3. Modelo de datos principal

```
profiles          → id (uuid, FK auth.users), role (admin-it | technician | user), name, email
issues            → id, title, description, status, priority, created_by, assigned_to, created_at, updated_at
issue_comments    → id, issue_id, author_id, body, created_at
issue_attachments → id, issue_id, storage_path, file_name, uploaded_by, created_at
remote_sessions   → id, issue_id (nullable), initiated_by, target_device_id, status, started_at, ended_at
devices           → id, name, owner_id, ip_local, last_seen, is_online
```

### 4. Acceso remoto: WebRTC + Señalización vía Supabase Realtime
**Decisión**: WebRTC peer-to-peer para LAN; para acceso externo se añaden servidores STUN/TURN (coturn autogestionado o servicio Twilio TURN).
**Alternativas consideradas**: Apache Guacamole (descartado: requiere infraestructura Java en servidor), noVNC (descartado: requiere agente VNC en cliente, mayor fricción), TeamViewer SDK (descartado: coste y dependencia de terceros).
**Rationale**: Sin coste de servidor para sesiones LAN, señalización reutiliza Supabase Realtime, control total sobre el protocolo.

**Nota**: En fase MVP el "control remoto" será **compartición de pantalla + chat** (WebRTC `getDisplayMedia`). El control completo del ratón/teclado requiere un agente de escritorio (fase 2).

### 5. Autenticación y Roles
**Decisión**: Supabase Auth con magic link / email+password. Roles almacenados en `profiles.role` y aplicados via RLS en cada tabla.
**Roles**:
- `admin-it`: acceso total, puede asignar issues y ver todas las sesiones remotas.
- `technician`: puede ver y actualizar issues asignados, iniciar sesiones remotas.
- `user`: puede crear issues y ver solo los suyos.

### 6. Estructura de carpetas Frontend

```
src/
  features/
    auth/
    issues/
    remote/
    dashboard/
  components/       ← ShadCN + componentes compartidos
  lib/              ← supabaseClient, utils
  hooks/
  types/
  routes/
```

### 7. Convenciones para AGENTS.md
- Componentes React: PascalCase, un componente por archivo.
- Hooks: prefijo `use`, camelCase.
- Funciones de Supabase: en `lib/` o dentro del feature correspondiente.
- No usar `any` en TypeScript; preferir `unknown` + type guards.
- Clases Tailwind ordenadas con `prettier-plugin-tailwindcss`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

## Risks / Trade-offs

- **WebRTC NAT traversal** → Mitigation: provisionar servidores TURN antes de lanzamiento; testear en redes restrictivas (VPN corporativa, CGNAT).
- **RLS mal configurada en Supabase** → Mitigation: tests de integración con usuario de cada rol antes de desplegar; revisión de policies en code review.
- **Adjuntos en Supabase Storage** → Mitigation: limitar tamaño (5 MB por archivo), validar MIME types en el cliente y en Storage policies.
- **Escalabilidad de Realtime** → Mitigation: Supabase Realtime soporta ~200 conexiones concurrentes en tier gratuito; monitorizar y escalar plan según demanda.
- **Compartición de pantalla (MVP) vs. control real** → Trade-off aceptado: MVP más rápido sin necesidad de agente instalable. Roadmap claro hacia fase 2.
