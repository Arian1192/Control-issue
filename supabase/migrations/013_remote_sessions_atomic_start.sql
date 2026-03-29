-- ============================================================
-- 013_remote_sessions_atomic_start.sql
-- Crea o recupera sesión remota abierta de forma atómica
-- ============================================================

create or replace function public.create_or_get_open_remote_session(
  p_issue_id uuid,
  p_target_device_id uuid
)
returns public.remote_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_role text;
  v_is_active boolean;
  v_session public.remote_sessions;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select role, is_active
    into v_role, v_is_active
  from public.profiles
  where id = v_actor_id;

  if v_role is null then
    raise exception 'Profile not found'
      using errcode = '42501';
  end if;

  if coalesce(v_is_active, false) = false then
    raise exception 'Inactive profile cannot start remote sessions'
      using errcode = '42501';
  end if;

  if v_role not in ('admin-it', 'technician') then
    raise exception 'Only admin-it or technician can start remote sessions'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.devices d
    where d.id = p_target_device_id
  ) then
    raise exception 'Target device not found'
      using errcode = 'P0002';
  end if;

  -- Lock por dispositivo para evitar carreras entre requests concurrentes.
  perform pg_advisory_xact_lock(
    hashtext('remote_sessions_device_lock'),
    hashtext(p_target_device_id::text)
  );

  select rs.*
    into v_session
  from public.remote_sessions rs
  where rs.target_device_id = p_target_device_id
    and rs.status in ('pendiente', 'aceptada', 'activa')
  order by
    case rs.status
      when 'activa' then 0
      when 'aceptada' then 1
      else 2
    end,
    coalesce(rs.started_at, rs.accepted_at, now()) desc,
    rs.id
  limit 1;

  if found then
    return v_session;
  end if;

  insert into public.remote_sessions (
    issue_id,
    initiated_by,
    target_device_id,
    status,
    connection_phase,
    failure_reason
  )
  values (
    p_issue_id,
    v_actor_id,
    p_target_device_id,
    'pendiente',
    'idle',
    null
  )
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.create_or_get_open_remote_session(uuid, uuid) from public;
grant execute on function public.create_or_get_open_remote_session(uuid, uuid) to authenticated;
