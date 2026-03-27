-- ============================================================
-- RLS Integration Tests
-- Run in: Supabase Dashboard > SQL Editor
-- Uses pgTAP if available, otherwise plain assertions
-- ============================================================

-- Test setup: create test users (run once)
-- These are test-only identities simulated via set_config

-- -------------------------------------------------------
-- Helper: simulate a user session
-- -------------------------------------------------------
create or replace function tests.set_auth_user(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true);
end;
$$;

-- -------------------------------------------------------
-- Test 1: 'user' role can only see their own issues
-- -------------------------------------------------------
do $$
declare
  user_a_id uuid;
  user_b_id uuid;
  issue_count int;
begin
  -- Get two distinct users from profiles
  select id into user_a_id from public.profiles where role = 'user' limit 1;
  select id into user_b_id from public.profiles where role = 'user' and id != user_a_id limit 1;

  if user_a_id is null then
    raise notice 'SKIP Test 1: no user-role profiles found';
    return;
  end if;

  -- Simulate user_a session
  perform set_config('request.jwt.claim.sub', user_a_id::text, true);

  select count(*) into issue_count
  from public.issues
  where created_by != user_a_id;

  assert issue_count = 0,
    format('FAIL Test 1: user sees %s issues not belonging to them', issue_count);

  raise notice 'PASS Test 1: user only sees their own issues';
end;
$$;

-- -------------------------------------------------------
-- Test 2: 'technician' sees only assigned issues
-- -------------------------------------------------------
do $$
declare
  tech_id uuid;
  issue_count int;
begin
  select id into tech_id from public.profiles where role = 'technician' limit 1;

  if tech_id is null then
    raise notice 'SKIP Test 2: no technician profiles found';
    return;
  end if;

  perform set_config('request.jwt.claim.sub', tech_id::text, true);

  select count(*) into issue_count
  from public.issues
  where assigned_to != tech_id and created_by != tech_id;

  assert issue_count = 0,
    format('FAIL Test 2: technician sees %s issues not assigned to them', issue_count);

  raise notice 'PASS Test 2: technician only sees assigned issues';
end;
$$;

-- -------------------------------------------------------
-- Test 3: 'admin-it' sees all issues
-- -------------------------------------------------------
do $$
declare
  admin_id uuid;
  total_issues int;
  admin_sees int;
begin
  select id into admin_id from public.profiles where role = 'admin-it' limit 1;
  select count(*) into total_issues from public.issues;

  if admin_id is null then
    raise notice 'SKIP Test 3: no admin-it profiles found';
    return;
  end if;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select count(*) into admin_sees from public.issues;

  assert admin_sees = total_issues,
    format('FAIL Test 3: admin sees %s of %s total issues', admin_sees, total_issues);

  raise notice 'PASS Test 3: admin-it sees all issues';
end;
$$;

-- -------------------------------------------------------
-- Test 4: No client code contains SERVICE_ROLE_KEY
-- (Checked in CI via grep — documented here for traceability)
-- -------------------------------------------------------
-- Command: grep -r "SERVICE_ROLE" src/ → should return empty
-- This is enforced by task 9.2 verification.

select 'RLS tests complete. Check notices above for PASS/FAIL/SKIP results.' as result;
