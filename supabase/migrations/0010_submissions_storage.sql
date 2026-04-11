-- 0010_submissions_storage.sql
-- Creates the 'submission-files' Storage bucket and defines RLS policies
-- so students can upload/read their own path and teachers can read
-- files belonging to their assigned students.
--
-- Path convention: '{student_id}/{submission_id}/strokes.json'
--                  '{student_id}/{submission_id}/drawing.png'
-- The first folder segment is the student's auth.users id (via students.profile_id).
-- storage.foldername(name) returns the path split by '/' as text[],
-- so index [1] is the student profile_id and index [2] is the submission_id.

-- ─────────────────────────────────────────
-- Bucket (private, re-runnable)
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('submission-files', 'submission-files', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- Policies on storage.objects scoped to bucket_id = 'submission-files'
-- ─────────────────────────────────────────

-- Student can INSERT only into their own folder (first segment = their auth uid)
drop policy if exists "submission_files_student_insert" on storage.objects;
create policy "submission_files_student_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'submission-files'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.students
      where profile_id = auth.uid()
    )
  );

-- Student can SELECT their own folder
drop policy if exists "submission_files_student_select" on storage.objects;
create policy "submission_files_student_select" on storage.objects
  for select
  using (
    bucket_id = 'submission-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Teacher can SELECT files belonging to their assigned students
drop policy if exists "submission_files_teacher_select" on storage.objects;
create policy "submission_files_teacher_select" on storage.objects
  for select
  using (
    bucket_id = 'submission-files'
    and exists (
      select 1 from public.students s
      where s.profile_id::text = (storage.foldername(name))[1]
        and s.teacher_id = auth.uid()
        and exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role = 'teacher'
        )
    )
  );

-- No UPDATE or DELETE policies — submission files are immutable once uploaded.
