-- 0003_profile_trigger.sql
-- Auto-creates a profiles row whenever a new row is inserted into auth.users.
--
-- BOOTSTRAP_TEACHER_EMAIL design:
--   The teacher email lives in Vercel environment variables. Postgres functions
--   cannot read Vercel env, and Supabase forbids ALTER DATABASE to set custom
--   GUCs in restricted roles (permission denied on `app.*` namespace).
--
--   Instead we store the value in public.app_config (see 0000_app_config.sql)
--   and read it inside the SECURITY DEFINER trigger. The db-migrate.mjs script
--   upserts the value from .env.local after migrations apply, so the email
--   stays out of source control and Vercel env remains the single source of
--   truth (operator copies it into app_config via the migration script).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_email text;
  resolved_role   text;
begin
  select value into bootstrap_email
  from public.app_config
  where key = 'bootstrap_teacher_email';

  if bootstrap_email is not null
     and lower(bootstrap_email) = lower(new.email)
  then
    resolved_role := 'teacher';
  else
    resolved_role := 'student';
  end if;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    resolved_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Re-runnable: drop trigger before recreating
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
