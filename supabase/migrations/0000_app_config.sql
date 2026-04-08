-- 0000_app_config.sql
-- Key-value config table for values that Postgres functions need but cannot
-- read from Vercel env. Populated by scripts/db-migrate.mjs after all
-- migrations apply. RLS is enabled with no policies — only SECURITY DEFINER
-- functions (e.g., public.handle_new_user) can read it.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
