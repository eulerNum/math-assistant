-- 0011_grading_fields.sql
-- Adds grading-related fields for Phase 4 (grading + mastery tracking).

-- ─────────────────────────────────────────
-- submissions: add is_correct for grading result
-- ─────────────────────────────────────────
-- nullable: submission exists before grading happens.
-- teacher grades later → is_correct is set at that point.
alter table public.submissions
  add column if not exists is_correct boolean,
  add column if not exists student_answer text;

-- ─────────────────────────────────────────
-- problem_variants: add approved flag
-- ─────────────────────────────────────────
-- new variants default to unapproved (false).
-- teacher must explicitly approve before student can see them.
alter table public.problem_variants
  add column if not exists approved boolean not null default false;

-- existing variants are already in use → backfill to approved = true
update public.problem_variants
  set approved = true
  where approved = false;
