-- 0003_profile_trigger.sql
-- Auto-creates a profiles row whenever a new row is inserted into auth.users.
--
-- BOOTSTRAP_TEACHER_EMAIL design:
--   The teacher email lives in Vercel environment variables. However, Postgres
--   functions cannot read Vercel env at runtime. Instead we use a Postgres GUC
--   (Grand Unified Configuration parameter) scoped to the database:
--
--     ALTER DATABASE postgres SET app.bootstrap_teacher_email = '<email>';
--
--   The main session operator runs this one-time via psql after migrations are
--   applied, copying the value from Vercel env into the DB setting.
--
--   Inside the trigger we read it with:
--     current_setting('app.bootstrap_teacher_email', true)
--   The second argument `true` means "missing_ok": returns NULL if the GUC is
--   not set, so the trigger degrades gracefully — all new users become 'student'
--   until the operator configures the GUC. No hardcoded email in source control.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_email text := current_setting('app.bootstrap_teacher_email', true);
  resolved_role   text;
begin
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
