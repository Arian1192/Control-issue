## Context

El registro manual de dispositivos requiere que el usuario conozca el sistema. El nuevo flujo invierte la iniciativa: el IT genera un link, el usuario lo recibe (por email, Slack, Teams, etc.), lo abre en su máquina y con un solo click autoriza la conexión. No necesita saber qué es un "dispositivo", ni cómo funciona WebRTC, ni nada técnico.

**Estado actual:**
- `devices` registrados manualmente desde `DevicesPage`
- No existe tabla de invitaciones
- La ruta `/remote/:sessionId` requiere que el dispositivo ya exista

## Goals / Non-Goals

**Goals:**
- El IT puede generar un link de invitación con un click desde la app.
- El usuario abre el link, ve una página simple, pulsa "Autorizar" y ya está.
- El dispositivo se registra automáticamente con nombre inferido del user-agent.
- Si había una sesión pendiente vinculada al invite, el usuario es redirigido directamente a ella.
- El link expira en 24h y se invalida tras el primer uso.

**Non-Goals:**
- Invitaciones sin login (el usuario debe tener cuenta en el sistema).
- Notificaciones por email/push desde la app (se envía el link por fuera: Slack, Teams, email corporativo).
- Múltiples usos del mismo link.
- Invitación a usuarios que no existen en el sistema.

## Decisions

### 1. Token UUID en `device_invites`

**Decisión**: usar `gen_random_uuid()` como token — es opaco, no predecible y suficientemente único para un link de un solo uso con expiración de 24h.

**Alternativas**: JWT firmado (más complejo, overkill para este caso); token corto alfanumérico (colisión posible con muchos invites).

### 2. La página `/invite/:token` requiere login

**Decisión**: si el usuario no está autenticado, se redirige a `/login?redirect=/invite/:token`. Tras login, se procesa el invite.

**Rationale**: sin login no sabemos a qué usuario asociar el dispositivo. El invite tiene `invited_user_id` que debe coincidir con el usuario autenticado para evitar que otro usuario use el link.

**UX**: en la página de login se muestra un banner: *"Iniciá sesión para autorizar la conexión con tu soporte técnico."*

### 3. Nombre del dispositivo inferido de `navigator.userAgent`

**Decisión**: parsear `navigator.userAgent` para extraer el SO y construir un nombre como `"Mac de María"`, `"Windows de María"`, `"Linux de María"`. El usuario puede renombrarlo después desde "Mis dispositivos".

**Alternativas**: pedir nombre al usuario → añade fricción; usar hostname (no disponible en browser).

### 4. El invite está vinculado a un usuario específico (`invited_user_id`)

**Decisión**: el admin selecciona el usuario al generar el invite. El link solo funciona si lo abre ese usuario (se valida `auth.uid() = invited_user_id`).

**Alternativa**: link abierto sin usuario fijo → cualquiera lo puede usar, menos seguro.

### 5. Sesión vinculada al invite (opcional)

**Decisión**: al generar el invite, el admin puede indicar si quiere iniciar una sesión automáticamente tras la aceptación. Si `session_id` está en el invite, tras registrar el dispositivo se redirige a `/remote/:session_id` directamente.

**Si no hay session_id**: el usuario va a `/devices` con un toast de confirmación.

## Risks / Trade-offs

- **Link interceptado**: si alguien obtiene el link Y las credenciales del usuario, podría autorizar desde otro equipo. Mitigado por: expiración corta (24h) + usuario específico + un solo uso.
- **Inferencia de userAgent poco fiable en algunos browsers**: se acepta como fallback con nombre genérico "Equipo de María".

## Migration Plan

1. Aplicar `supabase/migrations/008_device_invites.sql` (nueva tabla, no destructiva).
2. Desplegar frontend — nueva ruta pública `/invite/:token`.
3. Sin rollback complejo: la tabla puede eliminarse y la ruta simplemente devuelve 404.

## Open Questions

- ¿Debe el admin poder ver los invites pendientes (no usados) y cancelarlos? → Por simplicidad, no en esta primera versión.
- ¿Se copia el link al clipboard automáticamente al generarlo? → Sí, con feedback visual ("Link copiado").
