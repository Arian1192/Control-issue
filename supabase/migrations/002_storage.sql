-- ============================================================
-- 002_storage.sql
-- Supabase Storage bucket for issue attachments
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Create the bucket (if not already created via Dashboard)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'issue-attachments',
  'issue-attachments',
  false,                           -- private bucket
  5242880,                         -- 5 MB limit
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/zip',
    'application/x-gzip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload to their issue folders
create policy "attachments_upload" on storage.objects
  for insert with check (
    bucket_id = 'issue-attachments'
    and auth.role() = 'authenticated'
  );

-- Authenticated users can read attachments on their issues
create policy "attachments_read" on storage.objects
  for select using (
    bucket_id = 'issue-attachments'
    and auth.role() = 'authenticated'
  );
