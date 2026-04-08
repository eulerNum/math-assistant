-- 0002_rls.sql
-- Enables Row Level Security on profiles and students, then defines all policies.
-- Re-runnable: uses DROP POLICY IF EXISTS before each CREATE POLICY.

-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
alter table public.profiles enable row level security;

-- SELECT: own row only
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select
  using (auth.uid() = id);

-- UPDATE: own row only (USING + WITH CHECK so users cannot move the row to another id)
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT policy — 0003 trigger function runs as SECURITY DEFINER and bypasses RLS.
-- No DELETE policy — profiles are cascaded away when auth.users row is deleted.

-- ─────────────────────────────────────────
-- students
-- ─────────────────────────────────────────
alter table public.students enable row level security;

-- SELECT (teacher): the teacher who owns the record can read it
drop policy if exists students_select_own_teacher on public.students;
create policy students_select_own_teacher on public.students
  for select
  using (auth.uid() = teacher_id);

-- SELECT (student self): the student referenced by profile_id can read their own row
drop policy if exists students_select_self on public.students;
create policy students_select_self on public.students
  for select
  using (auth.uid() = profile_id);

-- INSERT: only a teacher may insert, and teacher_id must be themselves
drop policy if exists students_insert_teacher on public.students;
create policy students_insert_teacher on public.students
  for insert
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- UPDATE: same constraints as INSERT (USING guards the existing row, WITH CHECK guards the new values)
drop policy if exists students_update_teacher on public.students;
create policy students_update_teacher on public.students
  for update
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  )
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- No DELETE policy for Phase 1.
