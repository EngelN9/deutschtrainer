create or replace function public.delete_writing_submission_service(
  p_user_id uuid,
  p_submission_id uuid
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

  perform set_config('app.current_profile_id', p_user_id::text, true);
  return public.delete_own_writing_submission(p_submission_id);
end;
$$;

create or replace function public.record_listening_activity_service(
  p_user_id uuid,
  p_listening_asset_id uuid,
  p_session_key text,
  p_play_increment integer default 0,
  p_used_slow_speed boolean default false,
  p_transcript_viewed boolean default false
)
returns uuid
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

  perform set_config('app.current_profile_id', p_user_id::text, true);
  return public.record_listening_activity(
    p_listening_asset_id => p_listening_asset_id,
    p_session_key => p_session_key,
    p_play_increment => p_play_increment,
    p_used_slow_speed => p_used_slow_speed,
    p_transcript_viewed => p_transcript_viewed
  );
end;
$$;

revoke execute on function public.delete_own_writing_submission(uuid) from authenticated;
revoke execute on function public.record_listening_activity(
  uuid,
  text,
  integer,
  boolean,
  boolean
) from authenticated;

revoke all on function public.delete_writing_submission_service(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.record_listening_activity_service(
  uuid,
  uuid,
  text,
  integer,
  boolean,
  boolean
) from public, anon, authenticated;

grant execute on function public.delete_writing_submission_service(uuid, uuid)
to service_role;
grant execute on function public.record_listening_activity_service(
  uuid,
  uuid,
  text,
  integer,
  boolean,
  boolean
) to service_role;

comment on function public.delete_writing_submission_service(uuid, uuid)
is 'Server-only owner-scoped writing submission deletion boundary.';
comment on function public.record_listening_activity_service(
  uuid,
  uuid,
  text,
  integer,
  boolean,
  boolean
) is 'Server-only owner-scoped listening telemetry boundary.';
