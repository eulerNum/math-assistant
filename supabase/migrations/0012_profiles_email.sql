-- 0012_profiles_email.sql
-- Add email column to profiles for easier lookups (avoids auth.users admin API).

alter table public.profiles
  add column if not exists email text;

-- Backfill from auth.users
update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id
    and p.email is null;

-- Update trigger to also save email
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

  insert into public.profiles (id, role, display_name, email)
  values (
    new.id,
    resolved_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;
