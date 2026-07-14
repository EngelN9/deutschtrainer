alter table public.ai_usage_logs drop constraint ai_usage_logs_feature_check;
alter table public.ai_usage_logs add constraint ai_usage_logs_feature_check check (
  feature in (
    'evaluate_response',
    'evaluate_writing',
    'text_to_speech',
    'transcribe_audio',
    'generate_content'
  )
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('course', 'exercise')),
  entity_id uuid not null,
  version integer not null check (version > 0),
  snapshot_json jsonb not null,
  change_summary text not null default '',
  source_type public.source_type not null default 'human',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);

create index content_versions_entity_idx
on public.content_versions(entity_type, entity_id, version desc);

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('course', 'exercise')),
  entity_id uuid not null,
  content_version_id uuid not null references public.content_versions(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reviewer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'superseded')),
  request_notes text not null default '',
  review_notes text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index content_reviews_one_pending_idx
on public.content_reviews(entity_type, entity_id, content_version_id)
where status = 'pending';
create index content_reviews_queue_idx
on public.content_reviews(status, created_at desc);

create table public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  target_entity_type text not null default 'exercise'
    check (target_entity_type = 'exercise'),
  level public.cefr_level not null,
  exercise_type public.exercise_type not null
    check (exercise_type in ('multiple_choice', 'fill_blank', 'error_correction')),
  topic_zh_tw text not null,
  target_skill_ids text[] not null,
  request_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  output_json jsonb,
  validation_errors_json jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  provider_request_id text,
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 200),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (requested_by, idempotency_key)
);

create index ai_generation_jobs_requester_idx
on public.ai_generation_jobs(requested_by, created_at desc);
create index ai_generation_jobs_status_idx
on public.ai_generation_jobs(status, created_at desc);

create trigger ai_generation_jobs_set_updated_at
before update on public.ai_generation_jobs
for each row execute function public.set_updated_at();

alter table public.content_versions enable row level security;
alter table public.content_reviews enable row level security;
alter table public.ai_generation_jobs enable row level security;

create policy "content team reads versions"
on public.content_versions for select to authenticated
using (public.is_content_team());

create policy "content team reads reviews"
on public.content_reviews for select to authenticated
using (public.is_content_team());

create policy "content team reads generation jobs"
on public.ai_generation_jobs for select to authenticated
using (
  requested_by = public.current_profile_id()
  or public.current_app_role() in ('reviewer', 'admin')
);

drop policy if exists "content team manages courses" on public.courses;
drop policy if exists "content team manages exercises" on public.exercises;
drop policy if exists "content team manages exercise_options" on public.exercise_options;
drop policy if exists "content team manages exercise_answers" on public.exercise_answers;

create policy "content team reads courses"
on public.courses for select to authenticated
using (public.is_content_team());

create policy "content team reads exercises"
on public.exercises for select to authenticated
using (public.is_content_team());

create policy "content team reads exercise options"
on public.exercise_options for select to authenticated
using (public.is_content_team());

create policy "content team reads exercise answers"
on public.exercise_answers for select to authenticated
using (public.is_content_team());

create or replace function public.content_course_snapshot(p_course_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(courses)
  from public.courses
  where id = p_course_id
$$;

create or replace function public.content_exercise_snapshot(p_exercise_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exercise', to_jsonb(exercises),
    'options', coalesce(
      (
        select jsonb_agg(to_jsonb(exercise_options) order by order_index)
        from public.exercise_options
        where exercise_id = exercises.id
      ),
      '[]'::jsonb
    ),
    'answer', coalesce(
      (
        select to_jsonb(exercise_answers)
        from public.exercise_answers
        where exercise_id = exercises.id
      ),
      'null'::jsonb
    )
  )
  from public.exercises
  where id = p_exercise_id
$$;

create or replace function public.admin_save_course(
  p_course_id uuid,
  p_expected_version integer,
  p_draft jsonb,
  p_change_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := public.current_profile_id();
  v_role public.app_role := public.current_app_role();
  v_course public.courses%rowtype;
  v_version_id uuid;
  v_level public.cefr_level;
  v_title_zh_tw text;
  v_title_de text;
  v_description_zh_tw text;
begin
  if v_actor_id is null or v_role not in ('content_editor', 'admin') then
    raise exception 'content editor or admin role is required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_draft) <> 'object' then
    raise exception 'course draft must be an object' using errcode = '22023';
  end if;

  v_level := (p_draft ->> 'level')::public.cefr_level;
  v_title_zh_tw := trim(coalesce(p_draft ->> 'titleZhTw', ''));
  v_title_de := trim(coalesce(p_draft ->> 'titleDe', ''));
  v_description_zh_tw := trim(coalesce(p_draft ->> 'descriptionZhTw', ''));

  if char_length(v_title_zh_tw) not between 1 and 120
    or char_length(v_title_de) not between 1 and 120
    or char_length(v_description_zh_tw) not between 1 and 1000 then
    raise exception 'course draft fields are incomplete' using errcode = '22023';
  end if;

  if p_course_id is null then
    insert into public.courses (
      level,
      title_zh_tw,
      title_de,
      description_zh_tw,
      status,
      version,
      published_at
    ) values (
      v_level,
      v_title_zh_tw,
      v_title_de,
      v_description_zh_tw,
      'draft',
      1,
      null
    )
    returning * into v_course;
  else
    select * into v_course
    from public.courses
    where id = p_course_id and deleted_at is null
    for update;

    if not found then
      raise exception 'course was not found' using errcode = 'P0002';
    end if;
    if p_expected_version is null or v_course.version <> p_expected_version then
      raise exception 'course version conflict' using errcode = '40001';
    end if;

    update public.content_reviews
    set status = 'superseded', reviewed_at = now()
    where entity_type = 'course'
      and entity_id = v_course.id
      and status = 'pending';

    update public.courses
    set
      level = v_level,
      title_zh_tw = v_title_zh_tw,
      title_de = v_title_de,
      description_zh_tw = v_description_zh_tw,
      status = 'draft',
      version = version + 1,
      published_at = null
    where id = v_course.id
    returning * into v_course;
  end if;

  insert into public.content_versions (
    entity_type,
    entity_id,
    version,
    snapshot_json,
    change_summary,
    source_type,
    created_by
  ) values (
    'course',
    v_course.id,
    v_course.version,
    public.content_course_snapshot(v_course.id),
    trim(coalesce(p_change_summary, '')),
    'human',
    v_actor_id
  )
  returning id into v_version_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
  values (
    v_actor_id,
    'content.saved',
    'course',
    v_course.id::text,
    jsonb_build_object('version', v_course.version, 'contentVersionId', v_version_id)
  );

  return jsonb_build_object(
    'entity', to_jsonb(v_course),
    'contentVersionId', v_version_id
  );
end;
$$;

create or replace function public.admin_save_exercise(
  p_exercise_id uuid,
  p_expected_version integer,
  p_draft jsonb,
  p_change_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := public.current_profile_id();
  v_role public.app_role := public.current_app_role();
  v_exercise public.exercises%rowtype;
  v_version_id uuid;
  v_option jsonb;
  v_options jsonb := coalesce(p_draft -> 'options', '[]'::jsonb);
  v_answer_json jsonb := coalesce(p_draft -> 'answerJson', '{}'::jsonb);
  v_grading_policy_json jsonb := coalesce(p_draft -> 'gradingPolicyJson', '{}'::jsonb);
  v_payload_json jsonb := coalesce(p_draft -> 'payloadJson', '{}'::jsonb);
  v_activity_id uuid;
  v_level public.cefr_level;
  v_type public.exercise_type;
  v_source_type public.source_type;
begin
  if v_actor_id is null or v_role not in ('content_editor', 'admin') then
    raise exception 'content editor or admin role is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_draft) <> 'object'
    or jsonb_typeof(v_options) <> 'array'
    or jsonb_typeof(v_answer_json) <> 'object'
    or jsonb_typeof(v_grading_policy_json) <> 'object'
    or jsonb_typeof(v_payload_json) <> 'object' then
    raise exception 'exercise draft JSON is invalid' using errcode = '22023';
  end if;

  v_activity_id := (p_draft ->> 'activityId')::uuid;
  v_level := (p_draft ->> 'level')::public.cefr_level;
  v_type := (p_draft ->> 'type')::public.exercise_type;
  v_source_type := coalesce(p_draft ->> 'sourceType', 'human')::public.source_type;

  if v_source_type = 'ai_generated' then
    raise exception 'AI generated drafts must use the generation service' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_draft ->> 'title', '')), '') is null
    or nullif(trim(coalesce(p_draft ->> 'instructionZhTw', '')), '') is null
    or nullif(trim(coalesce(p_draft ->> 'promptDe', '')), '') is null then
    raise exception 'exercise draft fields are incomplete' using errcode = '22023';
  end if;

  if p_exercise_id is null then
    insert into public.exercises (
      activity_id,
      level,
      type,
      title,
      instruction_zh_tw,
      prompt_de,
      payload_json,
      skill_ids,
      grammar_topic_ids,
      vocabulary_ids,
      estimated_seconds,
      difficulty,
      source_type,
      review_status,
      status,
      version,
      order_index
    ) values (
      v_activity_id,
      v_level,
      v_type,
      trim(p_draft ->> 'title'),
      trim(p_draft ->> 'instructionZhTw'),
      trim(p_draft ->> 'promptDe'),
      v_payload_json,
      array(select jsonb_array_elements_text(coalesce(p_draft -> 'skillIds', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(p_draft -> 'grammarTopicIds', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(p_draft -> 'vocabularyIds', '[]'::jsonb))),
      (p_draft ->> 'estimatedSeconds')::integer,
      (p_draft ->> 'difficulty')::integer,
      v_source_type,
      'draft',
      'draft',
      1,
      (p_draft ->> 'orderIndex')::integer
    )
    returning * into v_exercise;
  else
    select * into v_exercise
    from public.exercises
    where id = p_exercise_id and deleted_at is null
    for update;

    if not found then
      raise exception 'exercise was not found' using errcode = 'P0002';
    end if;
    if p_expected_version is null or v_exercise.version <> p_expected_version then
      raise exception 'exercise version conflict' using errcode = '40001';
    end if;

    update public.content_reviews
    set status = 'superseded', reviewed_at = now()
    where entity_type = 'exercise'
      and entity_id = v_exercise.id
      and status = 'pending';

    update public.exercises
    set
      activity_id = v_activity_id,
      level = v_level,
      type = v_type,
      title = trim(p_draft ->> 'title'),
      instruction_zh_tw = trim(p_draft ->> 'instructionZhTw'),
      prompt_de = trim(p_draft ->> 'promptDe'),
      payload_json = v_payload_json,
      skill_ids = array(select jsonb_array_elements_text(coalesce(p_draft -> 'skillIds', '[]'::jsonb))),
      grammar_topic_ids = array(select jsonb_array_elements_text(coalesce(p_draft -> 'grammarTopicIds', '[]'::jsonb))),
      vocabulary_ids = array(select jsonb_array_elements_text(coalesce(p_draft -> 'vocabularyIds', '[]'::jsonb))),
      estimated_seconds = (p_draft ->> 'estimatedSeconds')::integer,
      difficulty = (p_draft ->> 'difficulty')::integer,
      source_type = case
        when source_type = 'ai_generated' then 'ai_assisted'::public.source_type
        else v_source_type
      end,
      review_status = 'draft',
      status = 'draft',
      version = version + 1,
      order_index = (p_draft ->> 'orderIndex')::integer
    where id = v_exercise.id
    returning * into v_exercise;
  end if;

  delete from public.exercise_options where exercise_id = v_exercise.id;
  for v_option in select value from jsonb_array_elements(v_options)
  loop
    insert into public.exercise_options (
      id,
      exercise_id,
      label,
      text_de,
      text_zh_tw,
      order_index,
      is_correct,
      metadata_json
    ) values (
      coalesce(nullif(v_option ->> 'id', '')::uuid, gen_random_uuid()),
      v_exercise.id,
      trim(v_option ->> 'label'),
      trim(v_option ->> 'textDe'),
      nullif(trim(coalesce(v_option ->> 'textZhTw', '')), ''),
      (v_option ->> 'orderIndex')::integer,
      coalesce((v_option ->> 'isCorrect')::boolean, false),
      coalesce(v_option -> 'metadataJson', '{}'::jsonb)
    );
  end loop;

  insert into public.exercise_answers (
    exercise_id,
    answer_json,
    grading_policy_json,
    explanation_zh_tw
  ) values (
    v_exercise.id,
    v_answer_json,
    v_grading_policy_json,
    trim(coalesce(p_draft ->> 'explanationZhTw', ''))
  )
  on conflict (exercise_id) do update
  set
    answer_json = excluded.answer_json,
    grading_policy_json = excluded.grading_policy_json,
    explanation_zh_tw = excluded.explanation_zh_tw,
    updated_at = now();

  insert into public.content_versions (
    entity_type,
    entity_id,
    version,
    snapshot_json,
    change_summary,
    source_type,
    created_by
  ) values (
    'exercise',
    v_exercise.id,
    v_exercise.version,
    public.content_exercise_snapshot(v_exercise.id),
    trim(coalesce(p_change_summary, '')),
    v_exercise.source_type,
    v_actor_id
  )
  returning id into v_version_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
  values (
    v_actor_id,
    'content.saved',
    'exercise',
    v_exercise.id::text,
    jsonb_build_object('version', v_exercise.version, 'contentVersionId', v_version_id)
  );

  return jsonb_build_object(
    'entity', public.content_exercise_snapshot(v_exercise.id),
    'contentVersionId', v_version_id
  );
end;
$$;

create or replace function public.admin_submit_content_review(
  p_entity_type text,
  p_entity_id uuid,
  p_expected_version integer,
  p_request_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := public.current_profile_id();
  v_role public.app_role := public.current_app_role();
  v_content_version_id uuid;
  v_review public.content_reviews%rowtype;
begin
  if v_actor_id is null or v_role not in ('content_editor', 'admin') then
    raise exception 'content editor or admin role is required' using errcode = '42501';
  end if;
  if p_entity_type not in ('course', 'exercise') then
    raise exception 'unsupported content entity type' using errcode = '22023';
  end if;

  select id into v_content_version_id
  from public.content_versions
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and version = p_expected_version;

  if v_content_version_id is null then
    raise exception 'content version was not found' using errcode = 'P0002';
  end if;

  if p_entity_type = 'course' then
    update public.courses
    set status = 'pending_review'
    where id = p_entity_id
      and version = p_expected_version
      and status in ('draft', 'rejected')
      and deleted_at is null;
  else
    update public.exercises
    set status = 'pending_review', review_status = 'pending_review'
    where id = p_entity_id
      and version = p_expected_version
      and status in ('draft', 'rejected')
      and deleted_at is null;
  end if;

  if not found then
    raise exception 'content is not ready for review' using errcode = '22023';
  end if;

  insert into public.content_reviews (
    entity_type,
    entity_id,
    content_version_id,
    requested_by,
    request_notes
  ) values (
    p_entity_type,
    p_entity_id,
    v_content_version_id,
    v_actor_id,
    trim(coalesce(p_request_notes, ''))
  )
  returning * into v_review;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
  values (
    v_actor_id,
    'content.review_requested',
    p_entity_type,
    p_entity_id::text,
    jsonb_build_object('version', p_expected_version, 'reviewId', v_review.id)
  );

  return to_jsonb(v_review);
end;
$$;

create or replace function public.admin_review_content(
  p_review_id uuid,
  p_decision text,
  p_review_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := public.current_profile_id();
  v_role public.app_role := public.current_app_role();
  v_review public.content_reviews%rowtype;
  v_version integer;
begin
  if v_actor_id is null or v_role not in ('reviewer', 'admin') then
    raise exception 'reviewer or admin role is required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'review decision must be approved or rejected' using errcode = '22023';
  end if;

  select * into v_review
  from public.content_reviews
  where id = p_review_id and status = 'pending'
  for update;

  if not found then
    raise exception 'pending review was not found' using errcode = 'P0002';
  end if;

  select version into v_version
  from public.content_versions
  where id = v_review.content_version_id;

  if v_review.entity_type = 'course' then
    update public.courses
    set status = p_decision::public.content_status
    where id = v_review.entity_id
      and version = v_version
      and status = 'pending_review'
      and deleted_at is null;
  else
    update public.exercises
    set
      status = p_decision::public.content_status,
      review_status = p_decision::public.review_status
    where id = v_review.entity_id
      and version = v_version
      and status = 'pending_review'
      and deleted_at is null;
  end if;

  if not found then
    raise exception 'content changed while review was pending' using errcode = '40001';
  end if;

  update public.content_reviews
  set
    reviewer_id = v_actor_id,
    status = p_decision,
    review_notes = trim(coalesce(p_review_notes, '')),
    reviewed_at = now()
  where id = v_review.id
  returning * into v_review;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
  values (
    v_actor_id,
    'content.review_' || p_decision,
    v_review.entity_type,
    v_review.entity_id::text,
    jsonb_build_object('version', v_version, 'reviewId', v_review.id)
  );

  return to_jsonb(v_review);
end;
$$;

create or replace function public.admin_publish_content(
  p_entity_type text,
  p_entity_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := public.current_profile_id();
  v_role public.app_role := public.current_app_role();
  v_review_id uuid;
  v_result jsonb;
begin
  if v_actor_id is null or v_role <> 'admin' then
    raise exception 'admin role is required' using errcode = '42501';
  end if;
  if p_entity_type not in ('course', 'exercise') then
    raise exception 'unsupported content entity type' using errcode = '22023';
  end if;

  select content_reviews.id into v_review_id
  from public.content_reviews
  join public.content_versions on content_versions.id = content_reviews.content_version_id
  where content_reviews.entity_type = p_entity_type
    and content_reviews.entity_id = p_entity_id
    and content_reviews.status = 'approved'
    and content_versions.version = p_expected_version
  order by content_reviews.reviewed_at desc
  limit 1;

  if v_review_id is null then
    raise exception 'approved review is required before publishing' using errcode = '42501';
  end if;

  if p_entity_type = 'course' then
    update public.courses
    set status = 'published', published_at = now()
    where id = p_entity_id
      and version = p_expected_version
      and status = 'approved'
      and deleted_at is null
    returning to_jsonb(courses) into v_result;
  else
    update public.exercises
    set status = 'published', review_status = 'approved'
    where id = p_entity_id
      and version = p_expected_version
      and status = 'approved'
      and review_status = 'approved'
      and deleted_at is null
    returning public.content_exercise_snapshot(id) into v_result;
  end if;

  if v_result is null then
    raise exception 'approved content was not found or version changed' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'entity', v_result,
    'reviewId', v_review_id,
    'publishedAt', now()
  );
end;
$$;

create or replace function public.enforce_content_publish_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity_type text;
begin
  if new.status <> 'published'
    or (tg_op = 'UPDATE' and old.status = 'published')
    or auth.role() = 'service_role'
    or auth.uid() is null then
    return new;
  end if;

  if public.current_app_role() <> 'admin' then
    raise exception 'admin role is required to publish content' using errcode = '42501';
  end if;

  if tg_table_name in ('courses', 'exercises') then
    v_entity_type := case when tg_table_name = 'courses' then 'course' else 'exercise' end;
    if not exists (
      select 1
      from public.content_reviews
      join public.content_versions on content_versions.id = content_reviews.content_version_id
      where content_reviews.entity_type = v_entity_type
        and content_reviews.entity_id = new.id
        and content_reviews.status = 'approved'
        and content_versions.version = new.version
    ) then
      raise exception 'approved review is required before publishing' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.audit_content_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity_type text;
begin
  if new.status = 'published'
    and (tg_op = 'INSERT' or old.status <> 'published') then
    v_entity_type := case
      when tg_table_name = 'courses' then 'course'
      when tg_table_name = 'exercises' then 'exercise'
      else trim(trailing 's' from tg_table_name)
    end;

    insert into public.audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata_json
    ) values (
      public.current_profile_id(),
      'content.published',
      v_entity_type,
      new.id::text,
      jsonb_build_object(
        'version', coalesce((to_jsonb(new) ->> 'version')::integer, 1),
        'table', tg_table_name
      )
    );
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['courses', 'units', 'lessons', 'activities', 'exercises']
  loop
    execute format(
      'create trigger %I before insert or update of status on public.%I for each row execute function public.enforce_content_publish_review()',
      v_table || '_enforce_publish_review',
      v_table
    );
    execute format(
      'create trigger %I after insert or update of status on public.%I for each row execute function public.audit_content_publish()',
      v_table || '_audit_publish',
      v_table
    );
  end loop;
end;
$$;

create or replace function public.admin_record_ai_exercise_draft(
  p_job_id uuid,
  p_draft jsonb,
  p_model text,
  p_provider_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.ai_generation_jobs%rowtype;
  v_exercise public.exercises%rowtype;
  v_version_id uuid;
  v_option jsonb;
  v_options jsonb := coalesce(p_draft -> 'options', '[]'::jsonb);
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_draft) <> 'object'
    or jsonb_typeof(v_options) <> 'array'
    or coalesce((p_draft ->> 'requiresHumanReview')::boolean, false) is not true then
    raise exception 'validated AI draft is required' using errcode = '22023';
  end if;

  select * into v_job
  from public.ai_generation_jobs
  where id = p_job_id and status in ('queued', 'processing')
  for update;

  if not found then
    raise exception 'active generation job was not found' using errcode = 'P0002';
  end if;

  insert into public.exercises (
    activity_id,
    level,
    type,
    title,
    instruction_zh_tw,
    prompt_de,
    payload_json,
    skill_ids,
    grammar_topic_ids,
    vocabulary_ids,
    estimated_seconds,
    difficulty,
    source_type,
    review_status,
    status,
    version,
    order_index
  ) values (
    v_job.activity_id,
    v_job.level,
    v_job.exercise_type,
    trim(p_draft ->> 'titleZhTw'),
    trim(p_draft ->> 'instructionZhTw'),
    trim(p_draft ->> 'promptDe'),
    coalesce(p_draft -> 'payloadJson', '{}'::jsonb),
    v_job.target_skill_ids,
    array(select jsonb_array_elements_text(coalesce(p_draft -> 'grammarTopicIds', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_draft -> 'vocabularyIds', '[]'::jsonb))),
    (p_draft ->> 'estimatedSeconds')::integer,
    (p_draft ->> 'difficulty')::integer,
    'ai_generated',
    'draft',
    'draft',
    1,
    (v_job.request_json ->> 'orderIndex')::integer
  )
  returning * into v_exercise;

  for v_option in select value from jsonb_array_elements(v_options)
  loop
    insert into public.exercise_options (
      id,
      exercise_id,
      label,
      text_de,
      text_zh_tw,
      order_index,
      is_correct,
      metadata_json
    ) values (
      (v_option ->> 'id')::uuid,
      v_exercise.id,
      trim(v_option ->> 'label'),
      trim(v_option ->> 'textDe'),
      nullif(trim(coalesce(v_option ->> 'textZhTw', '')), ''),
      (v_option ->> 'orderIndex')::integer,
      coalesce((v_option ->> 'isCorrect')::boolean, false),
      '{}'::jsonb
    );
  end loop;

  insert into public.exercise_answers (
    exercise_id,
    answer_json,
    grading_policy_json,
    explanation_zh_tw
  ) values (
    v_exercise.id,
    coalesce(p_draft -> 'answerJson', '{}'::jsonb),
    coalesce(p_draft -> 'gradingPolicyJson', '{}'::jsonb),
    trim(coalesce(p_draft ->> 'explanationZhTw', ''))
  );

  insert into public.content_versions (
    entity_type,
    entity_id,
    version,
    snapshot_json,
    change_summary,
    source_type,
    created_by
  ) values (
    'exercise',
    v_exercise.id,
    1,
    public.content_exercise_snapshot(v_exercise.id),
    'AI 生成草稿，等待人工審核。',
    'ai_generated',
    v_job.requested_by
  )
  returning id into v_version_id;

  update public.ai_generation_jobs
  set
    status = 'completed',
    output_json = jsonb_build_object(
      'exerciseId', v_exercise.id,
      'contentVersionId', v_version_id,
      'draft', p_draft
    ),
    validation_errors_json = '[]'::jsonb,
    provider = case when p_model like 'local-%' then 'local' else 'openai' end,
    model = p_model,
    provider_request_id = p_provider_request_id,
    completed_at = now(),
    error_code = null
  where id = v_job.id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json)
  values (
    v_job.requested_by,
    'content.ai_draft_created',
    'exercise',
    v_exercise.id::text,
    jsonb_build_object('jobId', v_job.id, 'version', 1, 'requiresHumanReview', true)
  );

  return jsonb_build_object(
    'jobId', v_job.id,
    'exerciseId', v_exercise.id,
    'contentVersionId', v_version_id,
    'status', 'draft',
    'reviewStatus', 'draft',
    'sourceType', 'ai_generated'
  );
end;
$$;

revoke all on function public.content_course_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.content_exercise_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.admin_record_ai_exercise_draft(uuid, jsonb, text, text)
from public, anon, authenticated;

grant select on table
  public.content_versions,
  public.content_reviews,
  public.ai_generation_jobs
to authenticated;

grant select, insert, update on table public.ai_generation_jobs to service_role;
grant select, insert, delete on table public.content_versions to service_role;
grant select, insert, update, delete on table public.content_reviews to service_role;
grant all privileges on table
  public.courses,
  public.exercises,
  public.exercise_options,
  public.exercise_answers,
  public.audit_logs
to service_role;
grant select, update on table public.profiles to service_role;
grant select on table public.skills to service_role;

grant execute on function public.admin_save_course(uuid, integer, jsonb, text) to authenticated;
grant execute on function public.admin_save_exercise(uuid, integer, jsonb, text) to authenticated;
grant execute on function public.admin_submit_content_review(text, uuid, integer, text)
to authenticated;
grant execute on function public.admin_review_content(uuid, text, text) to authenticated;
grant execute on function public.admin_publish_content(text, uuid, integer) to authenticated;
grant execute on function public.admin_record_ai_exercise_draft(uuid, jsonb, text, text)
to service_role;
