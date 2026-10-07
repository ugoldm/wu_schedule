-- Shared WU events remain in the static snapshot. Only selections are private.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.owner_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table private.course_groups (
  semester_code text not null,
  course_id text not null,
  discipline text not null,
  required boolean not null default false,
  primary key (semester_code, course_id)
);
create table private.preset_templates (
  semester_code text primary key,
  presets jsonb not null
);

create table public.user_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_code text not null,
  selected_course_ids text[] not null,
  profile text not null default 'custom' check (profile in ('custom', 'iurii', 'anna', 'both')),
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, semester_code)
);
alter table public.user_plans enable row level security;
revoke all on public.user_plans from public, anon, authenticated;
grant select on public.user_plans to authenticated;
create policy "Read own plan" on public.user_plans for select to authenticated
  using (user_id = (select auth.uid()) and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google');

-- These functions never accept a user ID from the caller. Owner access is an
-- administrative grant to a verified auth.users UUID, never user-editable metadata.
create function public.get_schedule_context(p_semester text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_owner boolean;
  v_presets jsonb := '{}'::jsonb;
  v_plan jsonb;
begin
  if v_user is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'Google sign-in required' using errcode = '42501';
  end if;
  if not exists (select 1 from private.course_groups where semester_code = p_semester) then
    raise exception 'Unknown semester' using errcode = '22023';
  end if;
  select exists(select 1 from private.owner_accounts where user_id = v_user) into v_owner;
  if v_owner then
    select presets into v_presets from private.preset_templates where semester_code = p_semester;
  end if;
  select jsonb_build_object('selected_course_ids', selected_course_ids, 'profile', profile,
    'revision', revision, 'updated_at', updated_at) into v_plan
    from public.user_plans where user_id = v_user and semester_code = p_semester;
  return jsonb_build_object('user_id', v_user, 'is_owner', v_owner, 'presets', coalesce(v_presets, '{}'::jsonb), 'plan', v_plan);
end;
$$;

create function public.save_schedule_plan(
  p_semester text, p_course_ids text[], p_profile text, p_expected_revision bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_plan public.user_plans;
begin
  if v_user is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'Google sign-in required' using errcode = '42501';
  end if;
  if p_profile is null or p_profile not in ('custom', 'iurii', 'anna', 'both') or
    (p_profile <> 'custom' and not exists(select 1 from private.owner_accounts where user_id = v_user)) then
    raise exception 'Schedule profile is not available' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if p_course_ids is null or cardinality(p_course_ids) > 30 or
    not exists(select 1 from private.course_groups where semester_code = p_semester) or
    exists(select 1 from unnest(p_course_ids) as chosen(id) where id is null or
      not exists(select 1 from private.course_groups where semester_code = p_semester and course_id = id)) then
    raise exception 'Invalid course selection' using errcode = '22023';
  end if;
  if (select count(*) from unnest(p_course_ids)) <> (select count(distinct id) from unnest(p_course_ids) as chosen(id)) or
    exists(select discipline from private.course_groups where semester_code = p_semester and course_id = any(p_course_ids)
      group by discipline having count(*) > 1) then
    raise exception 'Choose one group per discipline' using errcode = '22023';
  end if;
  if exists(select 1 from private.course_groups as required_course where required_course.semester_code = p_semester
    and required_course.required and not exists(select 1 from private.course_groups as chosen
      where chosen.semester_code = p_semester and chosen.discipline = required_course.discipline
      and chosen.course_id = any(p_course_ids))) then
    raise exception 'Required courses must remain selected' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.user_plans(user_id, semester_code, selected_course_ids, profile, revision)
      values(v_user, p_semester, p_course_ids, p_profile, 1)
      on conflict (user_id, semester_code) do nothing returning * into v_plan;
    if found then return to_jsonb(v_plan) - 'user_id'; end if;
  end if;
  select * into v_plan from public.user_plans
    where user_id = v_user and semester_code = p_semester for update;
  if not found or v_plan.revision <> p_expected_revision then
    raise exception 'This schedule changed on another device' using errcode = '40001';
  end if;
  update public.user_plans set selected_course_ids = p_course_ids, profile = p_profile,
    revision = revision + 1, updated_at = now()
    where user_id = v_user and semester_code = p_semester returning * into v_plan;
  return to_jsonb(v_plan) - 'user_id';
end;
$$;

revoke all on function public.get_schedule_context(text) from public, anon;
revoke all on function public.save_schedule_plan(text, text[], text, bigint) from public, anon;
grant execute on function public.get_schedule_context(text) to authenticated;
grant execute on function public.save_schedule_plan(text, text[], text, bigint) to authenticated;
commit;
