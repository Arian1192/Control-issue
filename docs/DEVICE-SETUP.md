# Guía de setup de dispositivos — Control Issue + RustDesk

Esta guía explica cómo registrar equipos y usar el flujo de asistencia remota con RustDesk.

---

## 1) Registro del dispositivo en Control Issue

1. Iniciá sesión como `user`.
2. Ir a **Dispositivos** → **Mis dispositivos**.
3. Cargar nombre del equipo y guardar.
4. Esperar estado **En línea**.

> Esto solo registra disponibilidad en la app. No instala RustDesk todavía.

### Fallback si el usuario no tiene equipo registrado

Si soporte inicia la asistencia desde una incidencia y no encuentra un dispositivo disponible:

1. Genera un **enlace de acceso** desde la incidencia.
2. El usuario abre `/invite/:token` en el ordenador a asistir.
3. La app registra automáticamente ese equipo y lo redirige al flujo remoto.

---

## 2) Flujo real de asistencia remota

### Roles

- **Usuario final (sharer)**: acepta solicitud, instala/abre RustDesk y comparte su ID.
- **Técnico/Admin (viewer)**: inicia sesión remota y se conecta al ID del usuario.

### Paso a paso

1. Técnico entra a la incidencia y pulsa **Iniciar asistencia remota**.
2. Si hace falta, técnico comparte el **enlace de acceso** para registrar el equipo.
3. Usuario acepta la solicitud en `/remote/:sessionId`.
4. Usuario descarga RustDesk desde los enlaces sugeridos (Windows/macOS/Linux).
5. Usuario abre RustDesk y configura (si hace falta):
   - **ID Server** = `VITE_RUSTDESK_ID_SERVER`
   - **Key** = `VITE_RUSTDESK_KEY`
   - **Relay Server** = `VITE_RUSTDESK_RELAY_SERVER` (si está definido)
6. Usuario copia su **ID de RustDesk** (y contraseña si aplica) en el formulario de la sesión.
7. Técnico recibe esos datos en tiempo real y abre su cliente RustDesk local.
   - El cliente web es opcional y se usa solo si `VITE_RUSTDESK_WEB_CLIENT_ENABLED=true`.
8. Técnico pulsa **Marcar sesión en curso** cuando inicia la conexión.
9. Cualquier parte puede **Finalizar sesión** desde la app.

---

## 3) Notas para macOS (Intel / Apple Silicon)

Al primer uso macOS puede pedir permisos:

- Grabación de pantalla
- Accesibilidad

Sin esos permisos, no hay control remoto completo.

---

## 4) Troubleshooting rápido

### No aparece el dispositivo en RustDesk server

- Verificar que `hbbs` y `hbbr` estén arriba.
- Verificar puertos abiertos en host (21115/21116/21117 mínimo).
- Verificar que el cliente tenga el `ID Server` y `Key` correctos.

### El técnico no puede conectar desde otra red

- Confirmar `21116/udp` abierto.
- Confirmar DNS directo (sin proxy) para dominio RustDesk.
- Probar con `RUSTDESK_ALWAYS_USE_RELAY=Y` si hay NAT compleja.

### `rd.*` da 521 / infraestructura privada caída

- Activar `VITE_RUSTDESK_FORCE_PUBLIC_FALLBACK=true`.
- Eso fuerza modo contingencia en la UI: usar red pública oficial de RustDesk.
- En ese modo no configurar `ID Server/Relay/Key` en el cliente.

### En la app no llega la actualización de sesión

- Revisar conexión Realtime de Supabase en ambos navegadores.
- Verificar que ambos usuarios tengan sesión autenticada activa.

### El usuario no tiene dispositivos o están todos offline

- Desde la incidencia, usar **Generar enlace de acceso**.
- Pedir al usuario que abra ese link en el ordenador correcto.
- Tras autorizar, la app registra el equipo y continúa el flujo remoto.

---

## 5) Variables relevantes para frontend

```env
VITE_RUSTDESK_ID_SERVER=rd.tudominio.com
VITE_RUSTDESK_RELAY_SERVER=rd.tudominio.com:21117
VITE_RUSTDESK_KEY=<contenido-id_ed25519.pub>
VITE_RUSTDESK_WEB_CLIENT_ENABLED=false
VITE_RUSTDESK_FORCE_PUBLIC_FALLBACK=false
VITE_RUSTDESK_WEB_CLIENT_URL=https://rd.tudominio.com
VITE_RUSTDESK_WEB_CLIENT_TEMPLATE=
VITE_RUSTDESK_DOWNLOAD_WINDOWS_URL=
VITE_RUSTDESK_DOWNLOAD_MAC_INTEL_URL=
VITE_RUSTDESK_DOWNLOAD_MAC_ARM_URL=
VITE_RUSTDESK_DOWNLOAD_LINUX_URL=
```
