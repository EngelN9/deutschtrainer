create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  feature text not null check (feature in ('evaluate_response', 'evaluate_writing')),
  target_type text not null,
  target_id uuid not null,
  schema_version text not null,
  prompt_id text not null,
  prompt_version text not null,
  model text not null,
  feedback_json jsonb not null,
  requires_human_review boolean not null default false,
  cache_key text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 200),
  cached_from_id uuid references public.ai_feedback(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index ai_feedback_user_created_at_idx
on public.ai_feedback(user_id, created_at desc);
create index ai_feedback_user_cache_idx
on public.ai_feedback(user_id, feature, cache_key, created_at desc);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id text not null,
  idempotency_key text not null,
  feature text not null check (feature in ('evaluate_response', 'evaluate_writing')),
  model text not null,
  provider_request_id text,
  provider_attempt integer not null check (provider_attempt between 0 and 5),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost numeric(12, 6) not null default 0 check (estimated_cost >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  success boolean not null,
  cached boolean not null default false,
  logical_request boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  unique (request_id, provider_attempt)
);

create index ai_usage_logs_user_created_at_idx
on public.ai_usage_logs(user_id, created_at desc);
create index ai_usage_logs_feature_created_at_idx
on public.ai_usage_logs(feature, created_at desc);
create index ai_usage_logs_daily_limit_idx
on public.ai_usage_logs(user_id, feature, logical_request, created_at desc);

alter table public.ai_feedback enable row level security;
alter table public.ai_usage_logs enable row level security;

create policy "learners read own ai feedback"
on public.ai_feedback for select to authenticated
using (user_id = public.current_profile_id());

create policy "learners read own ai usage"
on public.ai_usage_logs for select to authenticated
using (user_id = public.current_profile_id());

grant select on table public.ai_feedback to authenticated;
grant select on table public.ai_usage_logs to authenticated;

grant usage on schema public to service_role;
grant select on table
  public.profiles,
  public.exercises,
  public.activities,
  public.lessons,
  public.exercise_answers,
  public.attempts,
  public.lesson_progress,
  public.error_records,
  public.skill_mastery,
  public.review_queue,
  public.ai_feedback,
  public.ai_usage_logs
to service_role;
grant insert on table public.ai_usage_logs to service_role;

drop policy if exists "published exercise answers are readable" on public.exercise_answers;
create policy "published fixed exercise answers are readable"
on public.exercise_answers for select to anon, authenticated
using (
  exists (
    select 1 from public.exercises
    where exercises.id = exercise_answers.exercise_id
      and exercises.type in (
        'multiple_choice',
        'multiple_select',
        'fill_blank',
        'sentence_order',
        'matching',
        'error_correction'
      )
      and exercises.status = 'published'
      and exercises.review_status = 'approved'
      and exercises.deleted_at is null
  )
);

alter table public.error_records
drop constraint if exists error_records_attempt_id_skill_id_key;
create index if not exists error_records_attempt_skill_idx
on public.error_records(attempt_id, skill_id);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when auth.role() = 'service_role'
        then nullif(current_setting('app.current_profile_id', true), '')::uuid
      else null
    end,
    (
      select id
      from public.profiles
      where auth_user_id = auth.uid() and deleted_at is null
    )
  )
$$;

create or replace function public.record_ai_attempt(
  p_user_id uuid,
  p_exercise_id uuid,
  p_response_de text,
  p_feedback_json jsonb,
  p_model text,
  p_schema_version text,
  p_prompt_id text,
  p_prompt_version text,
  p_cache_key text,
  p_idempotency_key text,
  p_duration_ms integer,
  p_used_hint boolean,
  p_mode public.attempt_mode,
  p_review_id uuid default null,
  p_cached_from_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_attempt_result jsonb;
  v_attempt_id uuid;
  v_feedback_id uuid;
  v_lesson_id uuid;
  v_skill_references text[];
  v_error jsonb;
  v_skill_id uuid;
  v_grammar_topic_id uuid;
  v_vocabulary_id uuid;
  v_error_type public.error_type;
  v_is_correct boolean;
  v_score numeric;
  v_completion_percent numeric;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_user_id and deleted_at is null
  ) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;

  perform set_config('app.current_profile_id', p_user_id::text, true);
  v_user_id := public.current_profile_id();

  if v_user_id is null then
    raise exception 'authenticated profile is required' using errcode = '42501';
  end if;

  if nullif(trim(p_response_de), '') is null or char_length(p_response_de) > 2000 then
    raise exception 'response must contain between 1 and 2000 characters' using errcode = '22023';
  end if;

  if nullif(trim(p_model), '') is null
    or nullif(trim(p_schema_version), '') is null
    or nullif(trim(p_prompt_id), '') is null
    or nullif(trim(p_prompt_version), '') is null
    or nullif(trim(p_cache_key), '') is null then
    raise exception 'AI metadata is incomplete' using errcode = '22023';
  end if;

  if jsonb_typeof(p_feedback_json) <> 'object'
    or jsonb_typeof(p_feedback_json -> 'errors') <> 'array'
    or not (p_feedback_json ? 'score')
    or not (p_feedback_json ? 'isCorrect') then
    raise exception 'AI feedback is incomplete' using errcode = '22023';
  end if;

  v_score := (p_feedback_json ->> 'score')::numeric;
  v_is_correct := (p_feedback_json ->> 'isCorrect')::boolean;

  if v_score < 0 or v_score > 100 then
    raise exception 'AI score must be between 0 and 100' using errcode = '22023';
  end if;

  select
    lessons.id,
    exercises.skill_ids
  into
    v_lesson_id,
    v_skill_references
  from public.exercises
  join public.activities on activities.id = exercises.activity_id
  join public.lessons on lessons.id = activities.lesson_id
  where exercises.id = p_exercise_id
    and exercises.type in ('translation', 'free_response')
    and exercises.status = 'published'
    and exercises.review_status = 'approved'
    and exercises.deleted_at is null
    and activities.status = 'published'
    and activities.deleted_at is null
    and lessons.status = 'published'
    and lessons.deleted_at is null;

  if v_lesson_id is null or coalesce(cardinality(v_skill_references), 0) = 0 then
    raise exception 'published AI exercise was not found' using errcode = '22023';
  end if;

  if p_cached_from_id is not null and not exists (
    select 1 from public.ai_feedback
    where id = p_cached_from_id and user_id = v_user_id
  ) then
    raise exception 'cached AI feedback was not found' using errcode = '22023';
  end if;

  v_attempt_result := public.record_fixed_attempt(
    p_exercise_id => p_exercise_id,
    p_answer_json => jsonb_build_object('responseDe', p_response_de),
    p_normalized_answer_json => jsonb_build_object(
      'responseDe',
      regexp_replace(trim(p_response_de), '\s+', ' ', 'g')
    ),
    p_grading_result_json => p_feedback_json,
    p_score => v_score,
    p_is_correct => v_is_correct,
    p_duration_ms => p_duration_ms,
    p_used_hint => p_used_hint,
    p_mode => p_mode,
    p_idempotency_key => p_idempotency_key,
    p_review_id => p_review_id
  );

  v_attempt_id := (v_attempt_result ->> 'attemptId')::uuid;

  if coalesce((v_attempt_result ->> 'idempotentReplay')::boolean, false) then
    select id into v_feedback_id
    from public.ai_feedback
    where user_id = v_user_id and idempotency_key = p_idempotency_key;

    select completion_percent into v_completion_percent
    from public.lesson_progress
    where user_id = v_user_id and lesson_id = v_lesson_id;

    return v_attempt_result || jsonb_build_object(
      'feedbackId', v_feedback_id,
      'completionPercent', v_completion_percent
    );
  end if;

  insert into public.ai_feedback (
    user_id,
    attempt_id,
    feature,
    target_type,
    target_id,
    schema_version,
    prompt_id,
    prompt_version,
    model,
    feedback_json,
    requires_human_review,
    cache_key,
    idempotency_key,
    cached_from_id
  ) values (
    v_user_id,
    v_attempt_id,
    'evaluate_response',
    'exercise_response',
    p_exercise_id,
    p_schema_version,
    p_prompt_id,
    p_prompt_version,
    p_model,
    p_feedback_json,
    coalesce((p_feedback_json ->> 'requiresHumanReview')::boolean, false),
    p_cache_key,
    p_idempotency_key,
    p_cached_from_id
  )
  returning id into v_feedback_id;

  delete from public.error_records where attempt_id = v_attempt_id;

  update public.skill_mastery
  set last_error_types = '{}'::public.error_type[]
  where user_id = v_user_id
    and exists (
      select 1 from public.skills
      where skills.id = skill_mastery.skill_id
        and (skills.id::text = any(v_skill_references) or skills.code = any(v_skill_references))
    );

  for v_error in
    select value from jsonb_array_elements(p_feedback_json -> 'errors')
  loop
    select id into v_skill_id
    from public.skills
    where (id::text = v_error ->> 'relatedSkillId' or code = v_error ->> 'relatedSkillId')
      and (id::text = any(v_skill_references) or code = any(v_skill_references))
    limit 1;

    if v_skill_id is null then
      raise exception 'AI feedback referenced an unrelated skill' using errcode = '22023';
    end if;

    v_grammar_topic_id := null;
    if nullif(v_error ->> 'grammarTopicId', '') is not null then
      select id into v_grammar_topic_id
      from public.grammar_topics
      where id::text = v_error ->> 'grammarTopicId' or code = v_error ->> 'grammarTopicId'
      limit 1;
    end if;

    v_vocabulary_id := null;
    if nullif(v_error ->> 'vocabularyId', '') is not null then
      select id into v_vocabulary_id
      from public.vocabulary
      where id::text = v_error ->> 'vocabularyId' or lemma = v_error ->> 'vocabularyId'
      limit 1;
    end if;

    v_error_type := (v_error ->> 'type')::public.error_type;

    insert into public.error_records (
      user_id,
      attempt_id,
      exercise_id,
      lesson_id,
      skill_id,
      grammar_topic_id,
      vocabulary_id,
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
      v_grammar_topic_id,
      v_vocabulary_id,
      v_error_type,
      (v_error ->> 'severity')::public.error_severity,
      v_error ->> 'original',
      v_error ->> 'correction',
      v_error ->> 'explanationZhTw'
    );

    update public.skill_mastery
    set last_error_types = case
      when v_error_type = any(last_error_types) then last_error_types
      else array_append(last_error_types, v_error_type)
    end
    where user_id = v_user_id and skill_id = v_skill_id;

    v_skill_id := null;
  end loop;

  if not v_is_correct and jsonb_array_length(p_feedback_json -> 'errors') = 0 then
    raise exception 'incorrect AI feedback must include at least one error' using errcode = '22023';
  end if;

  select completion_percent into v_completion_percent
  from public.lesson_progress
  where user_id = v_user_id and lesson_id = v_lesson_id;

  return v_attempt_result || jsonb_build_object(
    'feedbackId', v_feedback_id,
    'completionPercent', v_completion_percent
  );
end;
$$;

revoke all on function public.record_ai_attempt(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  public.attempt_mode,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.record_ai_attempt(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  public.attempt_mode,
  uuid,
  uuid
) to service_role;
