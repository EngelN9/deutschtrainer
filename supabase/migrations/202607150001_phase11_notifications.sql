alter table public.user_preferences
add column if not exists daily_reminder_enabled boolean not null default true,
add column if not exists daily_reminder_time time without time zone not null default '20:00',
add column if not exists review_reminder_enabled boolean not null default true,
add column if not exists inactivity_reminder_enabled boolean not null default true,
add column if not exists inactivity_days smallint not null default 3,
add column if not exists writing_complete_enabled boolean not null default true,
add column if not exists new_course_enabled boolean not null default true,
add column if not exists goal_complete_enabled boolean not null default true;

alter table public.user_preferences
drop constraint if exists user_preferences_inactivity_days_check;

alter table public.user_preferences
add constraint user_preferences_inactivity_days_check
check (inactivity_days between 2 and 14);

create or replace function public.complete_onboarding_service(
  p_user_id uuid,
  p_current_level public.cefr_level,
  p_target_level public.cefr_level,
  p_daily_minutes integer,
  p_learning_goals jsonb,
  p_notifications_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_rank integer;
  target_rank integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and deleted_at is null
  ) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;

  current_rank := case p_current_level
    when 'B1' then 1 when 'B2' then 2 when 'C1' then 3 when 'C2' then 4
  end;
  target_rank := case p_target_level
    when 'B1' then 1 when 'B2' then 2 when 'C1' then 3 when 'C2' then 4
  end;

  if target_rank < current_rank then
    raise exception 'target level cannot be below current level' using errcode = '22023';
  end if;
  if p_daily_minutes not between 5 and 240 then
    raise exception 'daily minutes are outside the supported range' using errcode = '22023';
  end if;
  if jsonb_typeof(p_learning_goals) <> 'array'
    or jsonb_array_length(p_learning_goals) not between 1 and 5
    or exists (
      select 1
      from jsonb_array_elements_text(p_learning_goals) as goal(value)
      where goal.value not in ('exam_preparation', 'work', 'study', 'immigration', 'daily_life')
    )
    or (
      select count(*) from jsonb_array_elements_text(p_learning_goals)
    ) <> (
      select count(distinct value) from jsonb_array_elements_text(p_learning_goals)
    )
  then
    raise exception 'learning goals are invalid' using errcode = '22023';
  end if;

  perform set_config('app.current_profile_id', p_user_id::text, true);

  insert into public.user_preferences (
    user_id,
    daily_minutes,
    target_level,
    notifications_enabled,
    learning_goals_json,
    theme
  ) values (
    p_user_id,
    p_daily_minutes,
    p_target_level,
    p_notifications_enabled,
    p_learning_goals,
    'system'
  )
  on conflict (user_id) do update set
    daily_minutes = excluded.daily_minutes,
    target_level = excluded.target_level,
    notifications_enabled = excluded.notifications_enabled,
    learning_goals_json = excluded.learning_goals_json,
    updated_at = now();

  insert into public.user_levels (
    user_id,
    current_level,
    target_level,
    placement_status
  ) values (
    p_user_id,
    p_current_level,
    p_target_level,
    'not_started'
  )
  on conflict (user_id) do update set
    current_level = excluded.current_level,
    target_level = excluded.target_level,
    updated_at = now();

  update public.profiles
  set onboarding_completed = true
  where id = p_user_id;

  return true;
end;
$$;

create or replace function public.update_notification_preferences_service(
  p_user_id uuid,
  p_notifications_enabled boolean,
  p_daily_reminder_enabled boolean,
  p_daily_reminder_time time without time zone,
  p_review_reminder_enabled boolean,
  p_inactivity_reminder_enabled boolean,
  p_inactivity_days smallint,
  p_writing_complete_enabled boolean,
  p_new_course_enabled boolean,
  p_goal_complete_enabled boolean,
  p_timezone text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and deleted_at is null
  ) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;
  if p_inactivity_days not between 2 and 14 then
    raise exception 'inactivity days are outside the supported range' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'timezone is invalid' using errcode = '22023';
  end if;

  perform set_config('app.current_profile_id', p_user_id::text, true);

  update public.profiles
  set timezone = p_timezone
  where id = p_user_id;

  insert into public.user_preferences (
    user_id,
    target_level,
    notifications_enabled,
    daily_reminder_enabled,
    daily_reminder_time,
    review_reminder_enabled,
    inactivity_reminder_enabled,
    inactivity_days,
    writing_complete_enabled,
    new_course_enabled,
    goal_complete_enabled
  ) values (
    p_user_id,
    coalesce(
      (select target_level from public.user_levels where user_id = p_user_id),
      'B2'::public.cefr_level
    ),
    p_notifications_enabled,
    p_daily_reminder_enabled,
    p_daily_reminder_time,
    p_review_reminder_enabled,
    p_inactivity_reminder_enabled,
    p_inactivity_days,
    p_writing_complete_enabled,
    p_new_course_enabled,
    p_goal_complete_enabled
  )
  on conflict (user_id) do update set
    notifications_enabled = excluded.notifications_enabled,
    daily_reminder_enabled = excluded.daily_reminder_enabled,
    daily_reminder_time = excluded.daily_reminder_time,
    review_reminder_enabled = excluded.review_reminder_enabled,
    inactivity_reminder_enabled = excluded.inactivity_reminder_enabled,
    inactivity_days = excluded.inactivity_days,
    writing_complete_enabled = excluded.writing_complete_enabled,
    new_course_enabled = excluded.new_course_enabled,
    goal_complete_enabled = excluded.goal_complete_enabled,
    updated_at = now();

  return true;
end;
$$;

revoke insert, update on table public.user_preferences from authenticated;
revoke insert, update on table public.user_levels from authenticated;
revoke update on table public.profiles from authenticated;

grant select on table public.profiles, public.user_preferences, public.user_levels to service_role;

revoke all on function public.complete_onboarding_service(
  uuid,
  public.cefr_level,
  public.cefr_level,
  integer,
  jsonb,
  boolean
) from public, anon, authenticated;
revoke all on function public.update_notification_preferences_service(
  uuid,
  boolean,
  boolean,
  time without time zone,
  boolean,
  boolean,
  smallint,
  boolean,
  boolean,
  boolean,
  text
) from public, anon, authenticated;

grant execute on function public.complete_onboarding_service(
  uuid,
  public.cefr_level,
  public.cefr_level,
  integer,
  jsonb,
  boolean
) to service_role;
grant execute on function public.update_notification_preferences_service(
  uuid,
  boolean,
  boolean,
  time without time zone,
  boolean,
  boolean,
  smallint,
  boolean,
  boolean,
  boolean,
  text
) to service_role;

comment on function public.complete_onboarding_service(
  uuid,
  public.cefr_level,
  public.cefr_level,
  integer,
  jsonb,
  boolean
) is 'Server-only atomic learner onboarding boundary.';
comment on function public.update_notification_preferences_service(
  uuid,
  boolean,
  boolean,
  time without time zone,
  boolean,
  boolean,
  smallint,
  boolean,
  boolean,
  boolean,
  text
) is 'Server-only learner notification preference update boundary.';
