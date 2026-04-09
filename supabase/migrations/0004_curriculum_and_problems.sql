-- 0004_curriculum_and_problems.sql
-- Creates curriculum hierarchy tables: curricula → chapters → problem_types → problems → problem_variants.
-- RLS is intentionally NOT enabled here (see 0005_curriculum_rls.sql).

-- ─────────────────────────────────────────
-- curricula: top-level curriculum master data
-- ─────────────────────────────────────────
create table if not exists public.curricula (
  id          text        primary key,              -- e.g. 'middle_3-1', 'high_math1'
  label       text        not null,                 -- e.g. '중학교 3학년 1학기'
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- chapters: units within a curriculum
-- ─────────────────────────────────────────
create table if not exists public.chapters (
  id            uuid        primary key default gen_random_uuid(),
  curriculum_id text        not null references public.curricula(id) on delete cascade,
  label         text        not null,               -- e.g. '제곱근과 실수'
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  unique (curriculum_id, sort_order)
);

create index if not exists chapters_curriculum_id_idx on public.chapters(curriculum_id);

-- ─────────────────────────────────────────
-- problem_types: sub-topics within a chapter
-- ─────────────────────────────────────────
create table if not exists public.problem_types (
  id          uuid        primary key default gen_random_uuid(),
  chapter_id  uuid        not null references public.chapters(id) on delete cascade,
  label       text        not null,                 -- e.g. '제곱근의 덧셈과 뺄셈'
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  unique (chapter_id, sort_order)
);

create index if not exists problem_types_chapter_id_idx on public.problem_types(chapter_id);

-- ─────────────────────────────────────────
-- problems: individual problems created by a teacher
-- ─────────────────────────────────────────
create table if not exists public.problems (
  id               uuid        primary key default gen_random_uuid(),
  problem_type_id  uuid        not null references public.problem_types(id) on delete cascade,
  teacher_id       uuid        not null references public.profiles(id) on delete cascade,
  source_image_path text,                           -- Supabase Storage path: problem-images/{teacher_id}/{uuid}.jpg
  statement        text        not null,            -- extracted problem body (LaTeX/text mixed)
  answer           text,
  difficulty       int         check (difficulty between 1 and 5),
  tags             text[]      default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists problems_problem_type_id_idx on public.problems(problem_type_id);
create index if not exists problems_teacher_id_idx on public.problems(teacher_id);

-- ─────────────────────────────────────────
-- problem_variants: AI-generated numeric variations of a problem
-- ─────────────────────────────────────────
create table if not exists public.problem_variants (
  id           uuid        primary key default gen_random_uuid(),
  problem_id   uuid        not null references public.problems(id) on delete cascade,
  statement    text        not null,
  answer       text,
  generated_by text        not null default 'claude-opus-4-6',
  created_at   timestamptz not null default now()
);

create index if not exists problem_variants_problem_id_idx on public.problem_variants(problem_id);
