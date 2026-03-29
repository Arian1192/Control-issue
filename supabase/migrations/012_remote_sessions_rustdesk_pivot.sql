-- ============================================================
-- 012_remote_sessions_rustdesk_pivot.sql
-- Pivot de sesiones remotas a flujo RustDesk (coord + handoff)
-- ============================================================

-- 1) Lifecycle extendido (idempotente)
alter table public.remote_sessions
  add column if not exists accepted_at timestamptz,
  add column if not exists connection_phase text,
  add column if not exists failure_reason text;

update public.remote_sessions
set connection_phase = coalesce(connection_phase, 'idle')
where connection_phase is null;

alter table public.remote_sessions
  alter column connection_phase set default 'idle',
  alter column connection_phase set not null;

-- 2) Estados de sesión soportados actualmente
do $$
begin
  alter table public.remote_sessions drop constraint if exists remote_sessions_status_check;

  alter table public.remote_sessions
    add constraint remote_sessions_status_check
    check (status in ('pendiente', 'aceptada', 'activa', 'rechazada', 'fallida', 'finalizada', 'cancelada'));
end $$;

-- 3) Metadatos RustDesk para coordinación en app
alter table public.remote_sessions
  add column if not exists rustdesk_id text,
  add column if not exists rustdesk_password text,
  add column if not exists rustdesk_ready_at timestamptz,
  add column if not exists rustdesk_platform text;

-- 4) Solo una sesión abierta por dispositivo (evita carreras)
drop index if exists public.remote_sessions_one_open_per_device_idx;
create unique index remote_sessions_one_open_per_device_idx
  on public.remote_sessions (target_device_id)
  where status in ('pendiente', 'aceptada', 'activa');
