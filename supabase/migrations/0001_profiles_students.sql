-- 0001_profiles_students.sql
-- Creates the core user-identity tables.
-- RLS is intentionally NOT enabled here (see 0002_rls.sql).
-- The auto-create trigger is NOT here (see 0003_profile_trigger.sql).

-- ─────────────────────────────────────────
-- profiles: one row per auth.users entry
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  role         text        not null check (role in ('teacher', 'student')) default 'student',
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- students: teacher ↔ student linking table
-- ─────────────────────────────────────────
create table if not exists public.students (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  profile_id uuid        not null unique references public.profiles(id) on delete cascade,
  grade      int,                    -- nullable; e.g. 9 for middle-3
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for teacher → students lookups
create index if not exists students_teacher_id_idx on public.students(teacher_id);
