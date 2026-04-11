-- 0009_assignments_submissions_rls.sql
-- Enables Row Level Security on assignments and submissions tables, then defines all policies.
-- Re-runnable: uses DROP POLICY IF EXISTS before each CREATE POLICY.

-- ─────────────────────────────────────────
-- assignments
-- ─────────────────────────────────────────
alter table public.assignments enable row level security;

-- SELECT (teacher): teacher sees all assignments they created
drop policy if exists assignments_select_teacher on public.assignments;
create policy assignments_select_teacher on public.assignments
  for select
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- SELECT (student): student sees assignments assigned to them
drop policy if exists assignments_select_student on public.assignments;
create policy assignments_select_student on public.assignments
  for select
  using (
    exists (
      select 1 from public.students
      where profile_id = auth.uid()
        and id = assignments.student_id
    )
  );

-- INSERT (teacher): teacher may create assignments
drop policy if exists assignments_insert_teacher on public.assignments;
create policy assignments_insert_teacher on public.assignments
  for insert
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- UPDATE (teacher): teacher may update status of their own assignments
drop policy if exists assignments_update_teacher on public.assignments;
create policy assignments_update_teacher on public.assignments
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

-- DELETE (teacher): teacher may delete their own assignments
drop policy if exists assignments_delete_teacher on public.assignments;
create policy assignments_delete_teacher on public.assignments
  for delete
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- ─────────────────────────────────────────
-- submissions
-- ─────────────────────────────────────────
alter table public.submissions enable row level security;

-- SELECT (student): student sees their own submissions (via assignment ownership)
drop policy if exists submissions_select_student on public.submissions;
create policy submissions_select_student on public.submissions
  for select
  using (
    exists (
      select 1 from public.assignments a
      join public.students s on s.id = a.student_id
      where a.id = submissions.assignment_id
        and s.profile_id = auth.uid()
    )
  );

-- SELECT (teacher): teacher sees submissions from their students
drop policy if exists submissions_select_teacher on public.submissions;
create policy submissions_select_teacher on public.submissions
  for select
  using (
    exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and a.teacher_id = auth.uid()
        and exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role = 'teacher'
        )
    )
  );

-- INSERT (student): student may submit to their own assignment
drop policy if exists submissions_insert_student on public.submissions;
create policy submissions_insert_student on public.submissions
  for insert
  with check (
    exists (
      select 1 from public.assignments a
      join public.students s on s.id = a.student_id
      where a.id = submissions.assignment_id
        and s.profile_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policies — submissions are immutable once created.
