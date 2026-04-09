-- 0007_storage_bucket.sql
-- Creates the 'problem-images' Storage bucket and defines RLS policies
-- so teachers can upload/read their own path and students can read
-- images belonging to their assigned teacher.
--
-- Path convention: '{teacher_id}/{uuid}.jpg' — the first folder segment
-- is the teacher's auth.users id. storage.foldername(name) returns
-- the path split by '/' as text[], so index [1] is the teacher id.

-- ─────────────────────────────────────────
-- Bucket (private, re-runnable)
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- Policies on storage.objects scoped to bucket_id = 'problem-images'
-- ─────────────────────────────────────────

-- Teacher can INSERT only into their own folder
drop policy if exists "problem_images_teacher_insert" on storage.objects;
create policy "problem_images_teacher_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'problem-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- Teacher can SELECT their own folder
drop policy if exists "problem_images_teacher_select" on storage.objects;
create policy "problem_images_teacher_select" on storage.objects
  for select
  using (
    bucket_id = 'problem-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Student can SELECT images whose first-folder segment matches one of
-- their linked teachers (via public.students)
drop policy if exists "problem_images_student_select" on storage.objects;
create policy "problem_images_student_select" on storage.objects
  for select
  using (
    bucket_id = 'problem-images'
    and exists (
      select 1 from public.students s
      where s.profile_id = auth.uid()
        and s.teacher_id::text = (storage.foldername(name))[1]
    )
  );

-- No UPDATE or DELETE policies for Phase 2 — image edits/removal not scoped yet.
