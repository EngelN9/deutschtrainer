create or replace function public.record_fixed_attempt_sync_service(
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
  p_review_id uuid default null,
  p_submitted_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_lesson_id uuid;
  v_previous_completed_at timestamptz;
  v_result jsonb;
  v_submitted_at timestamptz := coalesce(p_submitted_at, now());
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  if v_submitted_at < now() - interval '30 days'
    or v_submitted_at > now() + interval '5 minutes'
  then
    raise exception 'submitted_at is outside the accepted offline window'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id and deleted_at is null
  ) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;

  select lessons.id, lesson_progress.completed_at
  into v_lesson_id, v_previous_completed_at
  from public.exercises
  join public.activities on activities.id = exercises.activity_id
  join public.lessons on lessons.id = activities.lesson_id
  left join public.lesson_progress
    on lesson_progress.user_id = p_user_id
    and lesson_progress.lesson_id = lessons.id
  where exercises.id = p_exercise_id;

  perform set_config('app.current_profile_id', p_user_id::text, true);

  v_result := public.record_fixed_attempt(
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

  if coalesce((v_result ->> 'idempotentReplay')::boolean, false) then
    return v_result;
  end if;

  v_attempt_id := (v_result ->> 'attemptId')::uuid;

  update public.attempts
  set submitted_at = v_submitted_at
  where id = v_attempt_id and user_id = p_user_id;

  update public.attempt_answers
  set created_at = v_submitted_at
  where attempt_id = v_attempt_id;

  update public.error_records
  set created_at = v_submitted_at
  where attempt_id = v_attempt_id and user_id = p_user_id;

  update public.review_queue
  set
    scheduled_at = v_submitted_at + make_interval(days => interval_days),
    created_at = least(created_at, v_submitted_at)
  where source_attempt_id = v_attempt_id and user_id = p_user_id;

  update public.skill_mastery as mastery
  set
    last_practiced_at = coalesce(
      (
        select max(attempts.submitted_at)
        from public.attempts
        join public.exercises on exercises.id = attempts.exercise_id
        join public.skills on skills.id = mastery.skill_id
        where attempts.user_id = p_user_id
          and (
            skills.id::text = any(exercises.skill_ids)
            or skills.code = any(exercises.skill_ids)
          )
      ),
      v_submitted_at
    ),
    next_review_at = source_review.scheduled_at
  from public.review_queue as source_review
  where mastery.user_id = p_user_id
    and source_review.user_id = p_user_id
    and source_review.skill_id = mastery.skill_id
    and source_review.source_attempt_id = v_attempt_id
    and source_review.status = 'scheduled';

  update public.lesson_progress
  set
    last_activity_id = recent.activity_id,
    last_practiced_at = recent.submitted_at,
    completed_at = case
      when v_previous_completed_at is not null then v_previous_completed_at
      when lesson_progress.status = 'completed' then v_submitted_at
      else null
    end
  from (
    select activities.id as activity_id, attempts.submitted_at
    from public.attempts
    join public.exercises on exercises.id = attempts.exercise_id
    join public.activities on activities.id = exercises.activity_id
    where attempts.user_id = p_user_id and attempts.lesson_id = v_lesson_id
    order by attempts.submitted_at desc, attempts.created_at desc
    limit 1
  ) as recent
  where lesson_progress.user_id = p_user_id
    and lesson_progress.lesson_id = v_lesson_id;

  return v_result;
end;
$$;

revoke all on function public.record_fixed_attempt_sync_service(
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
  uuid,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.record_fixed_attempt_sync_service(
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
  uuid,
  timestamptz
) to service_role;

comment on function public.record_fixed_attempt_sync_service(
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
  uuid,
  timestamptz
) is 'Server-only fixed-attempt boundary that preserves bounded offline submission timestamps.';
