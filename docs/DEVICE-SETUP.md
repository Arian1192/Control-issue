# Guía de setup de dispositivos — Control Issue

Esta guía explica cómo registrar equipos en el sistema y cómo probar la asistencia remota con dos ordenadores (o dos navegadores en el mismo PC).

---

## ¿Qué es un "dispositivo"?

Un dispositivo es el registro de un ordenador en Control Issue. Al registrar un equipo, el sistema puede:

- Mostrar si está online u offline (heartbeat cada 30 segundos)
- Detectar y guardar su IP local automáticamente
- Recibir solicitudes de asistencia remota de técnicos o administradores

Cada dispositivo pertenece a un usuario y puede estar vinculado a incidencias.

---

## Requisitos previos

- La app debe correr en **HTTPS o `localhost`**. `getDisplayMedia()` (compartir pantalla) está bloqueado en HTTP con IP (ej. `http://192.168.x.x`).
- Navegador moderno con soporte WebRTC: Chrome 80+, Firefox 75+, Edge 80+, Safari 14+.
- Para compartir pantalla: el navegador debe tener permisos del sistema operativo (macOS → Preferencias del Sistema → Privacidad → Grabación de pantalla).

---

## 1. Registrar un dispositivo

1. Iniciá sesión con tu cuenta de **usuario** (rol `user`).
2. En el menú lateral, pulsá **Dispositivos**.
3. En la sección **"Mis dispositivos"**, escribí un nombre descriptivo en el campo de texto (ej. `PC-Oficina-01`, `Laptop-Dev`, `Mi-Mac`).
4. Pulsá **Añadir** o presioná Enter.
5. El dispositivo aparece en el listado con estado **Offline** inicialmente.
6. En unos segundos (el heartbeat se ejecuta al cargar la app), el estado cambia a **En línea** y se detecta la IP local automáticamente.

> **Tip:** Podés renombrar un dispositivo haciendo doble click sobre su nombre o usando el icono de lápiz. Podés eliminarlo con el icono de papelera (siempre que no tenga una sesión remota activa).

---

## 2. Probar la asistencia remota con 2 ordenadores

### Roles necesarios

| Equipo                | Rol                       | Acción                                                                   |
| --------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Equipo A (el usuario) | `user`                    | Registra su dispositivo, recibe y acepta la solicitud, comparte pantalla |
| Equipo B (el técnico) | `admin-it` o `technician` | Inicia la sesión remota, ve la pantalla                                  |

### Pasos

**En Equipo A (usuario):**

1. Abre la app e iniciá sesión como `user`.
2. Ve a **Dispositivos** → **Mis dispositivos** → registrá el equipo con un nombre.
3. Verificá que el estado sea **En línea** (verde).

**En Equipo B (técnico):**

4. Abre la app e iniciá sesión como `admin-it` o `technician`.
5. Ve a **Dispositivos** → sección **"Dispositivos de usuarios"**.
6. Deberías ver el dispositivo registrado en el Equipo A con estado **En línea**.
7. Pulsá **Iniciar asistencia remota**.

**De vuelta en Equipo A:**

8. Aparece un banner amarillo en la parte superior: _"Un técnico solicita acceso remoto a [nombre-dispositivo]"_.
9. Pulsá **Abrir y aceptar**.
10. El navegador pide permisos para compartir pantalla — elegí qué compartir (pantalla completa, ventana o pestaña).

**En Equipo B:**

11. Una vez aceptada la sesión, el stream de pantalla aparece en la vista de sesión remota.

---

## 3. Probar con 2 navegadores en el mismo PC

Esta es la forma más rápida de probar sin necesitar 2 máquinas físicas.

### Setup

- **Navegador A** (ej. Chrome): inicia sesión como `user`.
- **Navegador B** (ej. Firefox, o Chrome en modo Incógnito): inicia sesión como `admin-it`.

> Chrome y Firefox mantienen sesiones de autenticación completamente separadas. Chrome normal + Chrome Incógnito también funcionan.

### Flujo

1. En **Navegador A**: registrá un dispositivo y verificá que está online.
2. En **Navegador B**: ve a Dispositivos → Dispositivos de usuarios → **Iniciar asistencia remota** en el dispositivo de A.
3. En **Navegador A**: aceptá la solicitud en el banner → elegí qué compartir (podés compartir la pestaña del Navegador A).
4. En **Navegador B**: verás el stream de pantalla.

> **WebRTC en misma máquina**: los peers se conectan vía loopback (`127.0.0.1`) o IP LAN local. Funciona sin TURN server en este caso.

---

## 4. Troubleshooting

### El dispositivo aparece como Offline

- Recargá la página — el heartbeat se ejecuta al montar `AppLayout`.
- Verificá que tenés la sesión activa (no expiró).
- Comprobá la consola del navegador por errores de Supabase Realtime.

### El botón "Iniciar asistencia remota" aparece deshabilitado

- El dispositivo debe estar **En línea** para poder iniciar sesión.
- Verificá que el usuario con el dispositivo tenga la app abierta.

### El navegador no pide compartir pantalla

- La app debe correr en HTTPS o `localhost`. En HTTP puro (sin localhost), `getDisplayMedia` está bloqueado por el navegador.
- En **macOS**: verificá Preferencias del Sistema → Privacidad y seguridad → Grabación de pantalla → habilitá el navegador.
- En **Windows**: no requiere permisos adicionales de sistema.

### La conexión WebRTC no se establece (fallo en 30 segundos)

- En redes distintas sin TURN: configura el stack con `VITE_TURN_URL`, `TURN_SECRET`, `TURN_REALM` y `TURN_EXTERNAL_IP`.
- La app ya no usa `VITE_TURN_USERNAME` ni `VITE_TURN_CREDENTIAL`: las credenciales se generan dinámicamente desde la Edge Function `get-turn-credentials`.
  ```
  VITE_TURN_URL=turns:turn.tudominio.com:5349
  TURN_SECRET=<secret-compartido-con-supabase>
  TURN_REALM=turn.tudominio.com
  TURN_EXTERNAL_IP=<ip-publica-del-vps>
  ```
- Verificá que los puertos UDP (3478, 49152-65535) no estén bloqueados por el firewall.
- En el mismo PC o misma LAN, TURN no es necesario.

### Error "No podés eliminar el dispositivo porque tiene una sesión en curso"

- Finalizá o rechazá la sesión activa desde la página de sesión remota antes de eliminar el dispositivo.

---

## 5. Variables de entorno

```env
# Supabase (requerido)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# TURN server (opcional — solo necesario para conexiones fuera de LAN)
VITE_TURN_URL=turns:turn.tudominio.com:5349
TURN_SECRET=<secret-compartido-con-supabase>
TURN_REALM=turn.tudominio.com
TURN_EXTERNAL_IP=<ip-publica-del-vps>
```
