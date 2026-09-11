-- Fix the server-side hinted mastery delta, and make the arithmetic testable.
--
-- packages/learning-engine/src/index.ts was corrected in #37 so a hint halves the mastery gain
-- instead of subtracting a flat 8, and so a correct answer can never reduce mastery. That change
-- was never applied to this PL/pgSQL copy, which is the authoritative one: the TS function runs
-- only in the mobile mock/offline path (useLearningRecords.ts gates it on contentSource ===
-- "mock"), while every real attempt goes through record_fixed_attempt.
--
-- Before this migration a correct answer with a hint at difficulty <= 2 produced a delta of 0,
-- or -5 once the slow-response penalty applied. Correct answers lowered mastery.
--
-- The arithmetic is extracted into calculate_mastery_delta because it drifted precisely by being
-- inlined in a 449-line function that no test could reach without the full attempt fixture stack.
-- As a standalone immutable function it is checkable with a single SELECT.

create or replace function public.calculate_mastery_delta(
  p_is_correct boolean,
  p_used_hint boolean,
  p_difficulty integer,
  p_duration_ms integer,
  p_estimated_seconds integer
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  -- Mirrors calculateNextMastery in packages/learning-engine/src/index.ts. Keep the two in step:
  -- the TS copy serves offline mode, this one serves every API attempt.
  select case
    when p_is_correct then greatest(
      1,
      case
        when p_used_hint then round(v.gain / 2.0)
        else v.gain
      end
    )
    else -12 - p_difficulty
  end
  from (
    select (
      8
      + greatest(0, p_difficulty - 2)
      - case when p_duration_ms > p_estimated_seconds * 1500 then 5 else 0 end
    )::numeric as gain
  ) as v;
$$;

comment on function public.calculate_mastery_delta(boolean, boolean, integer, integer, integer) is
  'Mastery delta for one attempt. Mirrors calculateNextMastery in packages/learning-engine.';

revoke all on function public.calculate_mastery_delta(boolean, boolean, integer, integer, integer)
  from public, anon, authenticated;

-- record_fixed_attempt below is otherwise byte-identical to the definition installed by
-- 202607130001_phase4_learning_records.sql; only the delta assignment changed.

CREATE OR REPLACE FUNCTION public.record_fixed_attempt(p_exercise_id uuid, p_answer_json jsonb, p_normalized_answer_json jsonb, p_grading_result_json jsonb, p_score numeric, p_is_correct boolean, p_duration_ms integer, p_used_hint boolean, p_mode attempt_mode, p_idempotency_key text, p_review_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_attempt_id uuid;
  v_existing_attempt_id uuid;
  v_lesson_id uuid;
  v_activity_id uuid;
  v_estimated_seconds integer;
  v_difficulty integer;
  v_skill_references text[];
  v_skill_reference text;
  v_skill_id uuid;
  v_answer_reference jsonb;
  v_answer_explanation text;
  v_previous public.skill_mastery%rowtype;
  v_attempt_count integer;
  v_correct_count integer;
  v_incorrect_count integer;
  v_hint_count integer;
  v_average_response_time numeric;
  v_mastery_delta numeric;
  v_mastery_score numeric;
  v_confidence_score numeric;
  v_correct_streak integer;
  v_incorrect_streak integer;
  v_interval_days integer;
  v_priority integer;
  v_reason text;
  v_scheduled_at timestamptz;
  v_ease_factor numeric;
  v_active_review_id uuid;
  v_completed_ids uuid[];
  v_total_exercises integer;
  v_correct_exercises integer;
  v_completion_percent numeric;
  v_lesson_status public.lesson_progress_status;
  v_completed_at timestamptz;
  v_scheduled_reviews integer := 0;
begin
  v_user_id := public.current_profile_id();

  if v_user_id is null then
    raise exception 'authenticated profile is required' using errcode = '42501';
  end if;

  if p_score < 0 or p_score > 100 then
    raise exception 'score must be between 0 and 100' using errcode = '22023';
  end if;

  if p_duration_ms < 0 then
    raise exception 'duration must not be negative' using errcode = '22023';
  end if;

  select
    lessons.id,
    activities.id,
    exercises.estimated_seconds,
    exercises.difficulty,
    exercises.skill_ids
  into
    v_lesson_id,
    v_activity_id,
    v_estimated_seconds,
    v_difficulty,
    v_skill_references
  from public.exercises
  join public.activities on activities.id = exercises.activity_id
  join public.lessons on lessons.id = activities.lesson_id
  where exercises.id = p_exercise_id
    and exercises.status = 'published'
    and exercises.review_status = 'approved'
    and exercises.deleted_at is null
    and activities.status = 'published'
    and activities.deleted_at is null
    and lessons.status = 'published'
    and lessons.deleted_at is null;

  if v_lesson_id is null then
    raise exception 'published exercise was not found' using errcode = '22023';
  end if;

  select id into v_existing_attempt_id
  from public.attempts
  where user_id = v_user_id and idempotency_key = p_idempotency_key;

  if v_existing_attempt_id is not null then
    return jsonb_build_object(
      'attemptId', v_existing_attempt_id,
      'lessonId', v_lesson_id,
      'idempotentReplay', true
    );
  end if;

  if p_review_id is not null and not exists (
    select 1 from public.review_queue
    where id = p_review_id
      and user_id = v_user_id
      and exercise_id = p_exercise_id
      and status = 'scheduled'
  ) then
    raise exception 'scheduled review was not found' using errcode = '22023';
  end if;

  insert into public.attempts (
    user_id,
    exercise_id,
    lesson_id,
    submitted_at,
    score,
    is_correct,
    duration_ms,
    used_hint,
    mode,
    idempotency_key
  ) values (
    v_user_id,
    p_exercise_id,
    v_lesson_id,
    now(),
    p_score,
    p_is_correct,
    p_duration_ms,
    p_used_hint,
    p_mode,
    p_idempotency_key
  )
  returning id into v_attempt_id;

  insert into public.attempt_answers (
    attempt_id,
    exercise_id,
    answer_json,
    normalized_answer_json,
    grading_result_json
  ) values (
    v_attempt_id,
    p_exercise_id,
    p_answer_json,
    p_normalized_answer_json,
    p_grading_result_json
  );

  if p_review_id is not null then
    update public.review_queue
    set
      status = 'completed',
      completed_at = now(),
      completed_attempt_id = v_attempt_id
    where user_id = v_user_id
      and exercise_id = p_exercise_id
      and status = 'scheduled'
      and scheduled_at <= now();
  end if;

  select answer_json, explanation_zh_tw
  into v_answer_reference, v_answer_explanation
  from public.exercise_answers
  where exercise_id = p_exercise_id;

  foreach v_skill_reference in array coalesce(v_skill_references, '{}'::text[])
  loop
    select id into v_skill_id
    from public.skills
    where id::text = v_skill_reference or code = v_skill_reference
    limit 1;

    if v_skill_id is null then
      continue;
    end if;

    select * into v_previous
    from public.skill_mastery
    where user_id = v_user_id and skill_id = v_skill_id
    for update;

    v_attempt_count := coalesce(v_previous.attempt_count, 0) + 1;
    v_correct_count := coalesce(v_previous.correct_count, 0) + case when p_is_correct then 1 else 0 end;
    v_incorrect_count := coalesce(v_previous.incorrect_count, 0) + case when p_is_correct then 0 else 1 end;
    v_hint_count := coalesce(v_previous.hint_count, 0) + case when p_used_hint then 1 else 0 end;
    v_average_response_time := (
      coalesce(v_previous.average_response_time_ms, 0) * coalesce(v_previous.attempt_count, 0)
      + p_duration_ms
    ) / v_attempt_count;
    v_mastery_delta := public.calculate_mastery_delta(
      p_is_correct, p_used_hint, v_difficulty, p_duration_ms, v_estimated_seconds
    );
    v_mastery_score := greatest(0, least(100, coalesce(v_previous.mastery_score, 0) + v_mastery_delta));
    v_confidence_score := greatest(
      0,
      least(100, coalesce(v_previous.confidence_score, 0) + case when p_is_correct then 4 else -6 end)
    );
    v_correct_streak := case when p_is_correct then coalesce(v_previous.correct_streak, 0) + 1 else 0 end;
    v_incorrect_streak := case when p_is_correct then 0 else coalesce(v_previous.incorrect_streak, 0) + 1 end;

    if not p_is_correct then
      v_interval_days := 0;
      v_priority := 100;
      v_reason := 'incorrect_answer';
    elsif p_used_hint then
      v_interval_days := 1;
      v_priority := 80;
      v_reason := 'correct_with_hint';
    elsif p_duration_ms > v_estimated_seconds * 1500 then
      v_interval_days := 3;
      v_priority := 60;
      v_reason := 'correct_but_slow';
    elsif v_correct_streak >= 6 then
      v_interval_days := 30;
      v_priority := 20;
      v_reason := 'long_term_stable';
    elsif v_correct_streak >= 3 then
      v_interval_days := 14;
      v_priority := 30;
      v_reason := 'stable_multiple_times';
    else
      v_interval_days := 7;
      v_priority := 40;
      v_reason := 'correct_and_stable';
    end if;

    v_scheduled_at := now() + make_interval(days => v_interval_days);

    select ease_factor into v_ease_factor
    from public.review_queue
    where user_id = v_user_id and skill_id = v_skill_id and exercise_id = p_exercise_id
    order by created_at desc
    limit 1;
    v_ease_factor := coalesce(v_ease_factor, 2.50);
    v_ease_factor := case
      when p_is_correct then least(3.00, v_ease_factor + 0.05)
      else greatest(1.30, v_ease_factor - 0.20)
    end;

    insert into public.skill_mastery (
      user_id,
      skill_id,
      mastery_score,
      confidence_score,
      attempt_count,
      correct_count,
      incorrect_count,
      hint_count,
      average_response_time_ms,
      last_practiced_at,
      next_review_at,
      correct_streak,
      incorrect_streak,
      last_error_types
    ) values (
      v_user_id,
      v_skill_id,
      v_mastery_score,
      v_confidence_score,
      v_attempt_count,
      v_correct_count,
      v_incorrect_count,
      v_hint_count,
      v_average_response_time,
      now(),
      v_scheduled_at,
      v_correct_streak,
      v_incorrect_streak,
      case
        when p_is_correct then coalesce(v_previous.last_error_types, '{}'::public.error_type[])
        else array['task_completion'::public.error_type]
      end
    )
    on conflict (user_id, skill_id) do update set
      mastery_score = excluded.mastery_score,
      confidence_score = excluded.confidence_score,
      attempt_count = excluded.attempt_count,
      correct_count = excluded.correct_count,
      incorrect_count = excluded.incorrect_count,
      hint_count = excluded.hint_count,
      average_response_time_ms = excluded.average_response_time_ms,
      last_practiced_at = excluded.last_practiced_at,
      next_review_at = excluded.next_review_at,
      correct_streak = excluded.correct_streak,
      incorrect_streak = excluded.incorrect_streak,
      last_error_types = excluded.last_error_types;

    if not p_is_correct then
      insert into public.error_records (
        user_id,
        attempt_id,
        exercise_id,
        lesson_id,
        skill_id,
        type,
        severity,
        original,
        correction,
        explanation_zh_tw
      ) values (
        v_user_id,
        v_attempt_id,
        p_exercise_id,
        v_lesson_id,
        v_skill_id,
        'task_completion',
        case
          when p_score = 0 then 'major'::public.error_severity
          else 'moderate'::public.error_severity
        end,
        p_answer_json::text,
        coalesce(v_answer_reference::text, ''),
        coalesce(nullif(v_answer_explanation, ''), '請重新比較題目與參考答案。')
      );
    end if;

    select id into v_active_review_id
    from public.review_queue
    where user_id = v_user_id
      and skill_id = v_skill_id
      and exercise_id = p_exercise_id
      and status = 'scheduled'
    order by created_at desc
    limit 1
    for update;

    if v_active_review_id is null then
      insert into public.review_queue (
        user_id,
        skill_id,
        exercise_id,
        source_attempt_id,
        priority,
        scheduled_at,
        reason,
        interval_days,
        ease_factor
      ) values (
        v_user_id,
        v_skill_id,
        p_exercise_id,
        v_attempt_id,
        v_priority,
        v_scheduled_at,
        v_reason,
        v_interval_days,
        v_ease_factor
      );
    else
      update public.review_queue
      set
        source_attempt_id = v_attempt_id,
        priority = v_priority,
        scheduled_at = v_scheduled_at,
        reason = v_reason,
        interval_days = v_interval_days,
        ease_factor = v_ease_factor
      where id = v_active_review_id;
    end if;

    v_scheduled_reviews := v_scheduled_reviews + 1;
    v_skill_id := null;
    v_active_review_id := null;
  end loop;

  select coalesce(completed_exercise_ids, '{}'::uuid[])
  into v_completed_ids
  from public.lesson_progress
  where user_id = v_user_id and lesson_id = v_lesson_id
  for update;

  v_completed_ids := coalesce(v_completed_ids, '{}'::uuid[]);
  if not p_exercise_id = any(v_completed_ids) then
    v_completed_ids := array_append(v_completed_ids, p_exercise_id);
  end if;

  select count(*) into v_total_exercises
  from public.exercises
  join public.activities on activities.id = exercises.activity_id
  where activities.lesson_id = v_lesson_id
    and activities.status = 'published'
    and activities.deleted_at is null
    and exercises.status = 'published'
    and exercises.review_status = 'approved'
    and exercises.deleted_at is null;

  select count(distinct exercise_id) into v_correct_exercises
  from public.attempts
  where user_id = v_user_id
    and lesson_id = v_lesson_id
    and is_correct;

  v_completion_percent := case
    when v_total_exercises = 0 then 0
    else least(100, round(cardinality(v_completed_ids)::numeric / v_total_exercises * 100, 2))
  end;
  v_lesson_status := case
    when v_completion_percent >= 100 then 'completed'::public.lesson_progress_status
    else 'in_progress'::public.lesson_progress_status
  end;
  v_completed_at := case when v_lesson_status = 'completed' then now() else null end;

  insert into public.lesson_progress (
    user_id,
    lesson_id,
    status,
    completion_percent,
    completed_exercise_ids,
    correct_exercise_count,
    attempted_exercise_count,
    last_activity_id,
    last_practiced_at,
    completed_at
  ) values (
    v_user_id,
    v_lesson_id,
    v_lesson_status,
    v_completion_percent,
    v_completed_ids,
    v_correct_exercises,
    cardinality(v_completed_ids),
    v_activity_id,
    now(),
    v_completed_at
  )
  on conflict (user_id, lesson_id) do update set
    status = excluded.status,
    completion_percent = excluded.completion_percent,
    completed_exercise_ids = excluded.completed_exercise_ids,
    correct_exercise_count = excluded.correct_exercise_count,
    attempted_exercise_count = excluded.attempted_exercise_count,
    last_activity_id = excluded.last_activity_id,
    last_practiced_at = excluded.last_practiced_at,
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at);

  return jsonb_build_object(
    'attemptId', v_attempt_id,
    'lessonId', v_lesson_id,
    'completionPercent', v_completion_percent,
    'scheduledReviewCount', v_scheduled_reviews,
    'idempotentReplay', false
  );
end;
$function$;
