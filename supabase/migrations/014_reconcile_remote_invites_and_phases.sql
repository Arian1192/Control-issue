-- ============================================================
-- 014_reconcile_remote_invites_and_phases.sql
-- Reconciliación de schema para invites, timestamps y fases
-- ============================================================

-- -------------------------------------------------------
-- DEVICES: created_at faltaba en la historia de migraciones
-- -------------------------------------------------------
alter table public.devices
  add column if not exists created_at timestamptz not null default now();

-- -------------------------------------------------------
-- REMOTE SESSIONS: created_at + fases canónicas
-- -------------------------------------------------------
alter table public.remote_sessions
  add column if not exists created_at timestamptz not null default now();

update public.remote_sessions
set connection_phase = case coalesce(connection_phase, '')
  when '' then 'awaiting-user-acceptance'
  when 'idle' then 'awaiting-user-acceptance'
  when 'awaiting-agent' then 'awaiting-rustdesk-install'
  when 'agent-ready' then 'ready-for-technician'
  when 'connected' then 'active'
  when 'signaling' then 'awaiting-rustdesk-credentials'
  when 'closing' then 'closing'
  when 'failed' then 'failed'
  else connection_phase
end;

alter table public.remote_sessions
  alter column connection_phase set default 'awaiting-user-acceptance',
  alter column connection_phase set not null;

do $$
begin
  alter table public.remote_sessions drop constraint if exists remote_sessions_connection_phase_check;

  alter table public.remote_sessions
    add constraint remote_sessions_connection_phase_check
    check (
      connection_phase in (
        'awaiting-user-acceptance',
        'awaiting-rustdesk-install',
        'awaiting-rustdesk-credentials',
        'ready-for-technician',
        'active',
        'closing',
        'failed'
      )
    );
end $$;

-- -------------------------------------------------------
-- DEVICE INVITES: la tabla existe en types/specs pero no en migraciones
-- -------------------------------------------------------
create table if not exists public.device_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  session_id uuid references public.remote_sessions(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.device_invites
  add column if not exists issue_id uuid references public.issues(id) on delete set null;

alter table public.device_invites
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists invited_by uuid references public.profiles(id) on delete cascade,
  add column if not exists invited_user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists device_id uuid references public.devices(id) on delete set null,
  add column if not exists session_id uuid references public.remote_sessions(id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists device_invites_token_key on public.device_invites (token);
create index if not exists device_invites_invited_user_idx on public.device_invites (invited_user_id);
create index if not exists device_invites_issue_idx on public.device_invites (issue_id);

alter table public.device_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'device_invites'
      and policyname = 'device_invites_select_participants'
  ) then
    create policy "device_invites_select_participants" on public.device_invites
      for select using (
        invited_user_id = auth.uid()
        or invited_by = auth.uid()
        or public.current_role() = 'admin-it'
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'device_invites'
      and policyname = 'device_invites_insert_support'
  ) then
    create policy "device_invites_insert_support" on public.device_invites
      for insert with check (
        invited_by = auth.uid()
        and public.current_role() in ('admin-it', 'technician')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'device_invites'
      and policyname = 'device_invites_update_invited_user'
  ) then
    create policy "device_invites_update_invited_user" on public.device_invites
      for update using (
        invited_user_id = auth.uid()
        and used_at is null
      )
      with check (
        invited_user_id = auth.uid()
      );
  end if;
end $$;

-- -------------------------------------------------------
-- FUNCIÓN ATÓMICA: usar fase inicial canónica
-- -------------------------------------------------------
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
    coalesce(rs.started_at, rs.accepted_at, rs.created_at, now()) desc,
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
    'awaiting-user-acceptance',
    null
  )
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.create_or_get_open_remote_session(uuid, uuid) from public;
grant execute on function public.create_or_get_open_remote_session(uuid, uuid) to authenticated;
