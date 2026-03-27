-- ============================================================
-- 004_activity_log.sql
-- Activity feed: persistent event log with triggers
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- TABLE
-- -------------------------------------------------------
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  entity_type text,          -- 'issue' | 'session' | 'user' | 'comment' | 'attachment'
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- Index for efficient pagination (most recent first)
create index activity_log_created_at_idx on public.activity_log (created_at desc);

-- -------------------------------------------------------
-- RLS: only admin-it can read; no client writes
-- -------------------------------------------------------
alter table public.activity_log enable row level security;

create policy "activity_log_select_admin" on public.activity_log
  for select using (public.current_role() = 'admin-it');

-- -------------------------------------------------------
-- Enable Realtime (REQUIRED for live feed)
-- -------------------------------------------------------
alter publication supabase_realtime add table public.activity_log;

-- -------------------------------------------------------
-- TRIGGER FUNCTIONS
-- -------------------------------------------------------

-- 1.4 issues INSERT → issue_created
create or replace function public.log_issue_insert()
returns trigger language plpgsql security definer as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from public.profiles where id = NEW.created_by;

  insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
  values (
    'issue_created',
    NEW.created_by,
    'issue',
    NEW.id,
    jsonb_build_object(
      'title',            NEW.title,
      'priority',         NEW.priority,
      'created_by_name',  coalesce(v_actor_name, 'Usuario desconocido')
    )
  );
  return NEW;
end;
$$;

-- 1.5 issues UPDATE → status_changed / issue_assigned
create or replace function public.log_issue_update()
returns trigger language plpgsql security definer as $$
declare
  v_actor_id    uuid;
  v_assignee    text;
begin
  v_actor_id := auth.uid();

  -- Status change
  if OLD.status is distinct from NEW.status then
    insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
    values (
      'status_changed',
      v_actor_id,
      'issue',
      NEW.id,
      jsonb_build_object(
        'title',       NEW.title,
        'old_status',  OLD.status,
        'new_status',  NEW.status
      )
    );
  end if;

  -- Assignment change
  if OLD.assigned_to is distinct from NEW.assigned_to then
    if NEW.assigned_to is not null then
      select name into v_assignee from public.profiles where id = NEW.assigned_to;
    end if;

    insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
    values (
      'issue_assigned',
      v_actor_id,
      'issue',
      NEW.id,
      jsonb_build_object(
        'title',              NEW.title,
        'assigned_to_name',   coalesce(v_assignee, 'Sin asignar'),
        'assigned_to_id',     NEW.assigned_to
      )
    );
  end if;

  return NEW;
end;
$$;

-- 1.6 issue_comments INSERT → comment_added
create or replace function public.log_comment_insert()
returns trigger language plpgsql security definer as $$
declare
  v_issue_title text;
  v_author_name text;
begin
  select title into v_issue_title from public.issues where id = NEW.issue_id;
  select name  into v_author_name from public.profiles where id = NEW.author_id;

  insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
  values (
    'comment_added',
    NEW.author_id,
    'issue',
    NEW.issue_id,
    jsonb_build_object(
      'issue_title',   coalesce(v_issue_title, ''),
      'body_preview',  left(NEW.body, 80),
      'author_name',   coalesce(v_author_name, 'Usuario desconocido')
    )
  );
  return NEW;
end;
$$;

-- 1.7 issue_attachments INSERT → attachment_added
create or replace function public.log_attachment_insert()
returns trigger language plpgsql security definer as $$
declare
  v_issue_title text;
begin
  select title into v_issue_title from public.issues where id = NEW.issue_id;

  insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
  values (
    'attachment_added',
    NEW.uploaded_by,
    'issue',
    NEW.issue_id,
    jsonb_build_object(
      'issue_title', coalesce(v_issue_title, ''),
      'file_name',   NEW.file_name
    )
  );
  return NEW;
end;
$$;

-- 1.8 remote_sessions INSERT → session_started
create or replace function public.log_session_insert()
returns trigger language plpgsql security definer as $$
declare
  v_issue_title   text;
  v_device_name   text;
  v_initiator     text;
begin
  if NEW.issue_id is not null then
    select title into v_issue_title from public.issues where id = NEW.issue_id;
  end if;
  select name into v_device_name   from public.devices  where id = NEW.target_device_id;
  select name into v_initiator     from public.profiles where id = NEW.initiated_by;

  insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
  values (
    'session_started',
    NEW.initiated_by,
    'session',
    NEW.id,
    jsonb_build_object(
      'issue_title',        coalesce(v_issue_title, '—'),
      'device_name',        coalesce(v_device_name, 'Dispositivo desconocido'),
      'initiated_by_name',  coalesce(v_initiator, 'Usuario desconocido')
    )
  );
  return NEW;
end;
$$;

-- 1.9 remote_sessions UPDATE → session_ended / session_rejected
create or replace function public.log_session_update()
returns trigger language plpgsql security definer as $$
begin
  if OLD.status is distinct from NEW.status then
    if NEW.status in ('finalizada', 'rechazada') then
      insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
      values (
        case NEW.status
          when 'finalizada' then 'session_ended'
          when 'rechazada'  then 'session_rejected'
        end,
        auth.uid(),
        'session',
        NEW.id,
        jsonb_build_object('status', NEW.status)
      );
    end if;
  end if;
  return NEW;
end;
$$;

-- 1.10 profiles UPDATE → user_deactivated / user_reactivated
create or replace function public.log_profile_update()
returns trigger language plpgsql security definer as $$
begin
  if OLD.is_active is distinct from NEW.is_active then
    insert into public.activity_log (type, actor_id, entity_type, entity_id, metadata)
    values (
      case when NEW.is_active then 'user_reactivated' else 'user_deactivated' end,
      auth.uid(),
      'user',
      NEW.id,
      jsonb_build_object(
        'name',  NEW.name,
        'email', NEW.email
      )
    );
  end if;
  return NEW;
end;
$$;

-- -------------------------------------------------------
-- 1.11 Attach triggers
-- -------------------------------------------------------
create trigger trg_log_issue_insert
  after insert on public.issues
  for each row execute procedure public.log_issue_insert();

create trigger trg_log_issue_update
  after update on public.issues
  for each row execute procedure public.log_issue_update();

create trigger trg_log_comment_insert
  after insert on public.issue_comments
  for each row execute procedure public.log_comment_insert();

create trigger trg_log_attachment_insert
  after insert on public.issue_attachments
  for each row execute procedure public.log_attachment_insert();

create trigger trg_log_session_insert
  after insert on public.remote_sessions
  for each row execute procedure public.log_session_insert();

create trigger trg_log_session_update
  after update on public.remote_sessions
  for each row execute procedure public.log_session_update();

create trigger trg_log_profile_update
  after update on public.profiles
  for each row execute procedure public.log_profile_update();
