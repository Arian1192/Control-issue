-- ============================================================
-- 015_accept_device_invite_atomic.sql
-- Aceptación atómica de invites de dispositivo + hardening RLS
-- ============================================================

-- Defensa en profundidad: impedir updates de invites vencidos.
drop policy if exists "device_invites_update_invited_user" on public.device_invites;

create policy "device_invites_update_invited_user" on public.device_invites
  for update using (
    invited_user_id = auth.uid()
    and used_at is null
    and expires_at > now()
  )
  with check (
    invited_user_id = auth.uid()
  );

create or replace function public.accept_device_invite(
  p_token uuid,
  p_device_name text default null
)
returns table (
  device_id uuid,
  session_id uuid,
  already_consumed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_invite public.device_invites%rowtype;
  v_device_id uuid;
  v_session_id uuid;
  v_device_name text;
  v_inviter_role text;
  v_inviter_is_active boolean;
  v_existing_session public.remote_sessions%rowtype;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
    into v_invite
  from public.device_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Invite not found'
      using errcode = 'P0002';
  end if;

  if v_invite.invited_user_id <> v_actor_id then
    raise exception 'Invite does not belong to current user'
      using errcode = '42501';
  end if;

  if v_invite.used_at is not null then
    if v_invite.device_id is null then
      raise exception 'Invite already consumed without linked device'
        using errcode = 'P0001';
    end if;

    device_id := v_invite.device_id;
    session_id := v_invite.session_id;
    already_consumed := true;
    return next;
    return;
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Invite has expired'
      using errcode = '22023';
  end if;

  v_device_name := nullif(trim(coalesce(p_device_name, '')), '');
  if v_device_name is null then
    v_device_name := 'Mi equipo';
  end if;

  insert into public.devices (
    name,
    owner_id,
    is_online,
    last_seen
  )
  values (
    v_device_name,
    v_actor_id,
    true,
    now()
  )
  returning id into v_device_id;

  v_session_id := v_invite.session_id;

  if v_session_id is null and v_invite.issue_id is not null then
    select role, is_active
      into v_inviter_role, v_inviter_is_active
    from public.profiles
    where id = v_invite.invited_by;

    if v_inviter_role not in ('admin-it', 'technician') or coalesce(v_inviter_is_active, false) = false then
      raise exception 'Inviter is not an active support profile'
        using errcode = '42501';
    end if;

    perform pg_advisory_xact_lock(
      hashtext('remote_sessions_device_lock'),
      hashtext(v_device_id::text)
    );

    select rs.*
      into v_existing_session
    from public.remote_sessions rs
    where rs.target_device_id = v_device_id
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
      v_session_id := v_existing_session.id;
    else
      insert into public.remote_sessions (
        issue_id,
        initiated_by,
        target_device_id,
        status,
        connection_phase,
        failure_reason
      )
      values (
        v_invite.issue_id,
        v_invite.invited_by,
        v_device_id,
        'pendiente',
        'awaiting-user-acceptance',
        null
      )
      returning id into v_session_id;
    end if;
  end if;

  update public.device_invites
  set device_id = v_device_id,
      session_id = v_session_id,
      used_at = now()
  where id = v_invite.id;

  device_id := v_device_id;
  session_id := v_session_id;
  already_consumed := false;
  return next;
end;
$$;

revoke all on function public.accept_device_invite(uuid, text) from public;
grant execute on function public.accept_device_invite(uuid, text) to authenticated;
