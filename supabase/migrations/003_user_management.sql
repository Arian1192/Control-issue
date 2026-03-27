-- ============================================================
-- 003_user_management.sql
-- Adds is_active field to profiles and updates RLS policies
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1.1 Add is_active column
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- ============================================================
-- 1.2 Update profiles RLS policies
-- ============================================================

-- Drop existing policies that need updating
drop policy if exists "profiles_select_own"    on public.profiles;
drop policy if exists "profiles_select_admin"  on public.profiles;
drop policy if exists "profiles_update_admin"  on public.profiles;

-- Users can read their own profile (active or not — needed to detect inactive state)
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- Admin can read all profiles
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_role() = 'admin-it');

-- Admin can update any profile EXCEPT deactivating themselves (1.4)
create policy "profiles_update_admin" on public.profiles
  for update using (public.current_role() = 'admin-it')
  with check (
    -- Prevent admin from deactivating their own account
    not (id = auth.uid() and is_active = false)
  );

-- ============================================================
-- 1.3 Update issues RLS — exclude inactive users
-- ============================================================

drop policy if exists "issues_select_user"  on public.issues;
drop policy if exists "issues_insert"        on public.issues;
drop policy if exists "issues_update"        on public.issues;

create policy "issues_select_user" on public.issues
  for select using (
    (
      created_by = auth.uid()
      or assigned_to = auth.uid()
      or public.current_role() = 'admin-it'
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "issues_insert" on public.issues
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "issues_update" on public.issues
  for update using (
    (
      assigned_to = auth.uid()
      or public.current_role() = 'admin-it'
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

-- ============================================================
-- 1.3 Update devices RLS — exclude inactive users
-- ============================================================

drop policy if exists "devices_select"  on public.devices;
drop policy if exists "devices_insert"  on public.devices;
drop policy if exists "devices_update"  on public.devices;

create policy "devices_select" on public.devices
  for select using (
    (
      owner_id = auth.uid()
      or public.current_role() in ('admin-it', 'technician')
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "devices_insert" on public.devices
  for insert with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "devices_update" on public.devices
  for update using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

-- ============================================================
-- 1.3 Update remote_sessions RLS — exclude inactive users
-- ============================================================

drop policy if exists "sessions_select"  on public.remote_sessions;
drop policy if exists "sessions_insert"  on public.remote_sessions;
drop policy if exists "sessions_update"  on public.remote_sessions;

create policy "sessions_select" on public.remote_sessions
  for select using (
    (
      initiated_by = auth.uid()
      or target_device_id in (select id from public.devices where owner_id = auth.uid())
      or public.current_role() = 'admin-it'
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "sessions_insert" on public.remote_sessions
  for insert with check (
    initiated_by = auth.uid()
    and public.current_role() in ('admin-it', 'technician')
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "sessions_update" on public.remote_sessions
  for update using (
    (
      initiated_by = auth.uid()
      or target_device_id in (select id from public.devices where owner_id = auth.uid())
      or public.current_role() = 'admin-it'
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true
    )
  );
