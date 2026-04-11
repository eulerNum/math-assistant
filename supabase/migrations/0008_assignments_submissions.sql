-- 0008_assignments_submissions.sql
-- Creates assignments and submissions tables.
-- RLS is intentionally NOT enabled here (see 0009_assignments_submissions_rls.sql).

-- ─────────────────────────────────────────
-- assignments: teacher assigns a problem (or variant) to a student
-- ─────────────────────────────────────────
create table if not exists public.assignments (
  id          uuid        primary key default gen_random_uuid(),
  problem_id  uuid        not null references public.problems(id) on delete cascade,
  variant_id  uuid        references public.problem_variants(id) on delete set null,  -- nullable: original problem or variant
  student_id  uuid        not null references public.students(id) on delete cascade,
  teacher_id  uuid        not null references public.profiles(id) on delete cascade,
  status      text        not null default 'pending' check (status in ('pending', 'submitted', 'reviewed')),
  created_at  timestamptz not null default now()
);

create index if not exists assignments_student_id_idx on public.assignments(student_id);
create index if not exists assignments_teacher_id_idx on public.assignments(teacher_id);
create index if not exists assignments_problem_id_idx on public.assignments(problem_id);

-- ─────────────────────────────────────────
-- submissions: student submits a handwritten solution
-- ─────────────────────────────────────────
-- Storage path convention:
--   stroke_path:   submission-files/{student_id}/{submission_id}/strokes.json
--   drawing_path:  submission-files/{student_id}/{submission_id}/drawing.png
create table if not exists public.submissions (
  id              uuid        primary key default gen_random_uuid(),
  assignment_id   uuid        not null references public.assignments(id) on delete cascade,
  stroke_path     text        not null,
  drawing_path    text        not null,
  submitted_at    timestamptz not null default now()
);

create index if not exists submissions_assignment_id_idx on public.submissions(assignment_id);
