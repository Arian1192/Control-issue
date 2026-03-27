-- ============================================================
-- 001_initial_schema.sql
-- Control Issue — Initial database schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- PROFILES (extends auth.users)
-- -------------------------------------------------------
create table public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  role      text not null default 'user'
              check (role in ('admin-it', 'technician', 'user')),
  name      text not null default '',
  email     text not null default '',
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- ISSUES
-- -------------------------------------------------------
create table public.issues (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'abierto'
                check (status in ('abierto', 'en-progreso', 'resuelto', 'cerrado')),
  priority    text not null default 'media'
                check (priority in ('baja', 'media', 'alta', 'critica')),
  created_by  uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger issues_updated_at
  before update on public.issues
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------
-- ISSUE COMMENTS
-- -------------------------------------------------------
create table public.issue_comments (
  id        uuid primary key default gen_random_uuid(),
  issue_id  uuid not null references public.issues(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body      text not null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------
-- ISSUE ATTACHMENTS
-- -------------------------------------------------------
create table public.issue_attachments (
  id           uuid primary key default gen_random_uuid(),
  issue_id     uuid not null references public.issues(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  uploaded_by  uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------
-- DEVICES
-- -------------------------------------------------------
create table public.devices (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  owner_id  uuid not null references public.profiles(id),
  ip_local  text,
  last_seen timestamptz,
  is_online boolean not null default false
);

-- -------------------------------------------------------
-- REMOTE SESSIONS
-- -------------------------------------------------------
create table public.remote_sessions (
  id               uuid primary key default gen_random_uuid(),
  issue_id         uuid references public.issues(id),
  initiated_by     uuid not null references public.profiles(id),
  target_device_id uuid not null references public.devices(id),
  status           text not null default 'pendiente'
                     check (status in ('pendiente', 'activa', 'rechazada', 'finalizada', 'fallida')),
  started_at       timestamptz,
  ended_at         timestamptz
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.issues          enable row level security;
alter table public.issue_comments  enable row level security;
alter table public.issue_attachments enable row level security;
alter table public.devices         enable row level security;
alter table public.remote_sessions enable row level security;

-- Helper: get current user role
create or replace function public.current_role()
returns text
language sql stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -------------------------------------------------------
-- PROFILES policies
-- -------------------------------------------------------
-- Everyone can read their own profile
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- Admin can read all profiles
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_role() = 'admin-it');

-- Admin can update roles
create policy "profiles_update_admin" on public.profiles
  for update using (public.current_role() = 'admin-it');

-- -------------------------------------------------------
-- ISSUES policies
-- -------------------------------------------------------
-- Users see only their own issues
create policy "issues_select_user" on public.issues
  for select using (
    created_by = auth.uid()
    or assigned_to = auth.uid()
    or public.current_role() = 'admin-it'
  );

-- Anyone authenticated can create an issue
create policy "issues_insert" on public.issues
  for insert with check (auth.uid() is not null);

-- Technician can update assigned issues; admin can update all
create policy "issues_update" on public.issues
  for update using (
    assigned_to = auth.uid()
    or public.current_role() = 'admin-it'
  );

-- -------------------------------------------------------
-- ISSUE COMMENTS policies
-- -------------------------------------------------------
create policy "comments_select" on public.issue_comments
  for select using (
    issue_id in (
      select id from public.issues
      where created_by = auth.uid()
         or assigned_to = auth.uid()
         or public.current_role() = 'admin-it'
    )
  );

create policy "comments_insert" on public.issue_comments
  for insert with check (
    author_id = auth.uid()
    and issue_id in (
      select id from public.issues
      where created_by = auth.uid()
         or assigned_to = auth.uid()
         or public.current_role() = 'admin-it'
    )
  );

-- -------------------------------------------------------
-- ISSUE ATTACHMENTS policies
-- -------------------------------------------------------
create policy "attachments_select" on public.issue_attachments
  for select using (
    issue_id in (
      select id from public.issues
      where created_by = auth.uid()
         or assigned_to = auth.uid()
         or public.current_role() = 'admin-it'
    )
  );

create policy "attachments_insert" on public.issue_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and issue_id in (
      select id from public.issues
      where created_by = auth.uid()
         or assigned_to = auth.uid()
         or public.current_role() = 'admin-it'
    )
  );

-- -------------------------------------------------------
-- DEVICES policies
-- -------------------------------------------------------
-- Owner and admin can see devices
create policy "devices_select" on public.devices
  for select using (
    owner_id = auth.uid()
    or public.current_role() in ('admin-it', 'technician')
  );

-- Owner can register their own devices
create policy "devices_insert" on public.devices
  for insert with check (owner_id = auth.uid());

-- Owner can update their own devices (heartbeat)
create policy "devices_update" on public.devices
  for update using (owner_id = auth.uid());

-- -------------------------------------------------------
-- REMOTE SESSIONS policies
-- -------------------------------------------------------
-- Initiator, device owner, and admin can see sessions
create policy "sessions_select" on public.remote_sessions
  for select using (
    initiated_by = auth.uid()
    or target_device_id in (select id from public.devices where owner_id = auth.uid())
    or public.current_role() = 'admin-it'
  );

-- Technicians and admin can initiate sessions
create policy "sessions_insert" on public.remote_sessions
  for insert with check (
    initiated_by = auth.uid()
    and public.current_role() in ('admin-it', 'technician')
  );

-- Initiator and device owner can update session status
create policy "sessions_update" on public.remote_sessions
  for update using (
    initiated_by = auth.uid()
    or target_device_id in (select id from public.devices where owner_id = auth.uid())
    or public.current_role() = 'admin-it'
  );

-- ============================================================
-- REALTIME: Enable tables for Supabase Realtime
-- Run in Supabase Dashboard > Database > Replication
-- or via: select * from pg_publication_tables where pubname = 'supabase_realtime';
-- ============================================================
-- alter publication supabase_realtime add table public.issues;
-- alter publication supabase_realtime add table public.issue_comments;
-- alter publication supabase_realtime add table public.remote_sessions;
-- alter publication supabase_realtime add table public.devices;
