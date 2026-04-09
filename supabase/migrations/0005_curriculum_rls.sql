-- 0005_curriculum_rls.sql
-- Enables Row Level Security on curriculum hierarchy tables, then defines all policies.
-- Re-runnable: uses DROP POLICY IF EXISTS before each CREATE POLICY.

-- ─────────────────────────────────────────
-- curricula (read-only master data)
-- ─────────────────────────────────────────
alter table public.curricula enable row level security;

-- SELECT: any authenticated user may read curriculum list
drop policy if exists curricula_select_authenticated on public.curricula;
create policy curricula_select_authenticated on public.curricula
  for select
  using (auth.uid() is not null);

-- No INSERT/UPDATE/DELETE policies — seeded via migrations (service role only).

-- ─────────────────────────────────────────
-- chapters (read-only master data)
-- ─────────────────────────────────────────
alter table public.chapters enable row level security;

-- SELECT: any authenticated user
drop policy if exists chapters_select_authenticated on public.chapters;
create policy chapters_select_authenticated on public.chapters
  for select
  using (auth.uid() is not null);

-- No INSERT/UPDATE/DELETE policies.

-- ─────────────────────────────────────────
-- problem_types (read-only master data)
-- ─────────────────────────────────────────
alter table public.problem_types enable row level security;

-- SELECT: any authenticated user
drop policy if exists problem_types_select_authenticated on public.problem_types;
create policy problem_types_select_authenticated on public.problem_types
  for select
  using (auth.uid() is not null);

-- No INSERT/UPDATE/DELETE policies.

-- ─────────────────────────────────────────
-- problems
-- ─────────────────────────────────────────
alter table public.problems enable row level security;

-- SELECT (teacher): teacher sees only their own problems
drop policy if exists problems_select_teacher on public.problems;
create policy problems_select_teacher on public.problems
  for select
  using (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- SELECT (student): student sees problems belonging to their assigned teacher
drop policy if exists problems_select_student on public.problems;
create policy problems_select_student on public.problems
  for select
  using (
    exists (
      select 1 from public.students s
      where s.profile_id = auth.uid()
        and s.teacher_id = teacher_id
    )
  );

-- INSERT (teacher): teacher may insert their own problems
drop policy if exists problems_insert_teacher on public.problems;
create policy problems_insert_teacher on public.problems
  for insert
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    )
  );

-- UPDATE (teacher): teacher may update only their own problems
drop policy if exists problems_update_teacher on public.problems;
create policy problems_update_teacher on public.problems
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

-- No DELETE policy.

-- ─────────────────────────────────────────
-- problem_variants
-- ─────────────────────────────────────────
alter table public.problem_variants enable row level security;

-- SELECT: users who can see the parent problem may see its variants
drop policy if exists problem_variants_select on public.problem_variants;
create policy problem_variants_select on public.problem_variants
  for select
  using (
    exists (
      select 1 from public.problems p
      where p.id = problem_id
        and (
          p.teacher_id = auth.uid()
          or exists (
            select 1 from public.students s
            where s.profile_id = auth.uid()
              and s.teacher_id = p.teacher_id
          )
        )
    )
  );

-- INSERT: only the parent problem's teacher may insert variants
drop policy if exists problem_variants_insert_teacher on public.problem_variants;
create policy problem_variants_insert_teacher on public.problem_variants
  for insert
  with check (
    exists (
      select 1 from public.problems p
      where p.id = problem_id
        and p.teacher_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policies.
