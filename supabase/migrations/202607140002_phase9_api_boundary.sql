create or replace function public.record_fixed_attempt_service(
  p_user_id uuid,
  p_exercise_id uuid,
  p_answer_json jsonb,
  p_normalized_answer_json jsonb,
  p_grading_result_json jsonb,
  p_score numeric,
  p_is_correct boolean,
  p_duration_ms integer,
  p_used_hint boolean,
  p_mode public.attempt_mode,
  p_idempotency_key text,
  p_review_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id and deleted_at is null
  ) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;

  perform set_config('app.current_profile_id', p_user_id::text, true);

  return public.record_fixed_attempt(
    p_exercise_id => p_exercise_id,
    p_answer_json => p_answer_json,
    p_normalized_answer_json => p_normalized_answer_json,
    p_grading_result_json => p_grading_result_json,
    p_score => p_score,
    p_is_correct => p_is_correct,
    p_duration_ms => p_duration_ms,
    p_used_hint => p_used_hint,
    p_mode => p_mode,
    p_idempotency_key => p_idempotency_key,
    p_review_id => p_review_id
  );
end;
$$;

revoke execute on function public.record_fixed_attempt(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  numeric,
  boolean,
  integer,
  boolean,
  public.attempt_mode,
  text,
  uuid
) from authenticated;

revoke all on function public.record_fixed_attempt_service(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  numeric,
  boolean,
  integer,
  boolean,
  public.attempt_mode,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.record_fixed_attempt_service(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  numeric,
  boolean,
  integer,
  boolean,
  public.attempt_mode,
  text,
  uuid
) to service_role;

grant select on table
  public.courses,
  public.units,
  public.lessons,
  public.activities,
  public.exercises,
  public.exercise_options,
  public.exercise_answers,
  public.skills,
  public.attempts,
  public.attempt_answers,
  public.error_records,
  public.skill_mastery,
  public.review_queue,
  public.lesson_progress
to service_role;

comment on function public.record_fixed_attempt_service(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  numeric,
  boolean,
  integer,
  boolean,
  public.attempt_mode,
  text,
  uuid
) is 'Server-only fixed exercise attempt boundary. The API grades the raw answer before calling this function.';
