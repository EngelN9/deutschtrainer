create type public.writing_type as enum (
  'informal_email',
  'formal_email',
  'experience_description',
  'opinion',
  'complaint_letter',
  'advantages_disadvantages',
  'argumentative_essay',
  'forum_post',
  'summary',
  'formal_report',
  'academic_argument',
  'source_integration',
  'structured_review',
  'advanced_essay',
  'style_transformation',
  'critical_review',
  'professional_editing',
  'advanced_synthesis',
  'rhetorical_revision'
);

create type public.writing_submission_status as enum (
  'evaluating',
  'revision_requested',
  'completed',
  'evaluation_failed'
);

create table public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  level public.cefr_level not null,
  writing_type public.writing_type not null,
  title_zh_tw text not null,
  prompt_de text not null,
  prompt_zh_tw text not null,
  requirements_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(requirements_json) = 'array'),
  minimum_words integer not null check (minimum_words between 20 and 2000),
  maximum_words integer not null check (maximum_words between minimum_words and 2000),
  estimated_minutes integer not null check (estimated_minutes between 1 and 240),
  skill_ids text[] not null check (cardinality(skill_ids) > 0),
  review_status public.review_status not null default 'draft',
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (lesson_id, writing_type)
);

create index writing_prompts_level_status_idx
on public.writing_prompts(level, status, writing_type)
where deleted_at is null;

create trigger writing_prompts_set_updated_at
before update on public.writing_prompts
for each row execute function public.set_updated_at();

create table public.writing_prompt_rules (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null unique references public.writing_prompts(id) on delete cascade,
  grading_notes_zh_tw text not null,
  reference_outline_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(reference_outline_json) = 'array'),
  reference_version_de text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger writing_prompt_rules_set_updated_at
before update on public.writing_prompt_rules
for each row execute function public.set_updated_at();

create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  prompt_id uuid not null references public.writing_prompts(id) on delete restrict,
  level public.cefr_level not null,
  writing_type public.writing_type not null,
  current_version_id uuid,
  status public.writing_submission_status not null default 'evaluating',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index writing_submissions_user_updated_idx
on public.writing_submissions(user_id, updated_at desc);
create index writing_submissions_user_prompt_idx
on public.writing_submissions(user_id, prompt_id, updated_at desc);

create trigger writing_submissions_set_updated_at
before update on public.writing_submissions
for each row execute function public.set_updated_at();

alter table public.ai_feedback alter column attempt_id drop not null;
alter table public.ai_feedback add constraint ai_feedback_feature_target_check check (
  (
    feature = 'evaluate_response'
    and attempt_id is not null
    and target_type = 'exercise_response'
  )
  or (
    feature = 'evaluate_writing'
    and attempt_id is null
    and target_type = 'writing_version'
  )
);
create index ai_feedback_target_idx on public.ai_feedback(target_type, target_id);

create table public.writing_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  previous_version_id uuid references public.writing_versions(id) on delete set null,
  version_number integer not null check (version_number between 1 and 10),
  text_de text not null check (char_length(trim(text_de)) > 0),
  word_count integer not null check (word_count between 1 and 2000),
  diff_json jsonb not null default '[]'::jsonb check (jsonb_typeof(diff_json) = 'array'),
  ai_feedback_id uuid unique references public.ai_feedback(id) on delete set null,
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, version_number),
  unique (user_id, idempotency_key)
);

alter table public.writing_submissions
add constraint writing_submissions_current_version_fk
foreign key (current_version_id) references public.writing_versions(id) on delete set null;

create index writing_versions_submission_version_idx
on public.writing_versions(submission_id, version_number desc);
create index writing_versions_user_created_idx
on public.writing_versions(user_id, created_at desc);

create trigger writing_versions_set_updated_at
before update on public.writing_versions
for each row execute function public.set_updated_at();

alter table public.writing_prompts enable row level security;
alter table public.writing_prompt_rules enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.writing_versions enable row level security;

create policy "published writing prompts are readable"
on public.writing_prompts for select to anon, authenticated
using (
  status = 'published'
  and review_status = 'approved'
  and deleted_at is null
  and exists (
    select 1 from public.lessons
    where lessons.id = writing_prompts.lesson_id
      and lessons.status = 'published'
      and lessons.deleted_at is null
  )
);

create policy "learners read own writing submissions"
on public.writing_submissions for select to authenticated
using (user_id = public.current_profile_id());

create policy "learners read own writing versions"
on public.writing_versions for select to authenticated
using (user_id = public.current_profile_id());

grant select on table public.writing_prompts to anon, authenticated;
grant select on table public.writing_submissions to authenticated;
grant select on table public.writing_versions to authenticated;

grant select on table
  public.writing_prompts,
  public.writing_prompt_rules,
  public.writing_submissions,
  public.writing_versions
to service_role;

create or replace function public.prepare_writing_version(
  p_user_id uuid,
  p_prompt_id uuid,
  p_submission_id uuid,
  p_expected_current_version_id uuid,
  p_text_de text,
  p_word_count integer,
  p_diff_json jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.writing_versions%rowtype;
  v_submission public.writing_submissions%rowtype;
  v_prompt public.writing_prompts%rowtype;
  v_version_id uuid;
  v_version_number integer;
  v_previous_version_id uuid;
  v_feedback_id uuid;
  v_actual_word_count integer;
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

  select * into v_prompt
  from public.writing_prompts
  where id = p_prompt_id
    and status = 'published'
    and review_status = 'approved'
    and deleted_at is null;

  if v_prompt.id is null then
    raise exception 'published writing prompt was not found' using errcode = '22023';
  end if;

  if nullif(trim(p_text_de), '') is null or char_length(p_text_de) > 12000 then
    raise exception 'writing text is empty or too long' using errcode = '22023';
  end if;

  v_actual_word_count := cardinality(regexp_split_to_array(trim(p_text_de), '\s+'));
  if p_word_count <> v_actual_word_count
    or p_word_count < v_prompt.minimum_words
    or p_word_count > v_prompt.maximum_words then
    raise exception 'writing word count is outside the prompt limits' using errcode = '22023';
  end if;

  if jsonb_typeof(p_diff_json) <> 'array' then
    raise exception 'writing diff must be an array' using errcode = '22023';
  end if;

  select * into v_existing
  from public.writing_versions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    select ai_feedback_id into v_feedback_id
    from public.writing_versions where id = v_existing.id;

    return jsonb_build_object(
      'submissionId', v_existing.submission_id,
      'versionId', v_existing.id,
      'versionNumber', v_existing.version_number,
      'previousVersionId', v_existing.previous_version_id,
      'feedbackId', v_feedback_id,
      'created', false
    );
  end if;

  if p_submission_id is null then
    if p_expected_current_version_id is not null or jsonb_array_length(p_diff_json) > 0 then
      raise exception 'first writing version cannot have a previous version' using errcode = '22023';
    end if;

    insert into public.writing_submissions (
      user_id,
      lesson_id,
      prompt_id,
      level,
      writing_type,
      status
    ) values (
      p_user_id,
      v_prompt.lesson_id,
      v_prompt.id,
      v_prompt.level,
      v_prompt.writing_type,
      'evaluating'
    ) returning * into v_submission;

    v_version_number := 1;
    v_previous_version_id := null;
  else
    select * into v_submission
    from public.writing_submissions
    where id = p_submission_id and user_id = p_user_id
    for update;

    if v_submission.id is null or v_submission.prompt_id <> p_prompt_id then
      raise exception 'owned writing submission was not found' using errcode = '22023';
    end if;

    if p_expected_current_version_id is null
      or v_submission.current_version_id is distinct from p_expected_current_version_id then
      raise exception 'writing version conflict' using errcode = '40001';
    end if;

    if not exists (
      select 1 from public.writing_versions
      where id = v_submission.current_version_id and ai_feedback_id is not null
    ) then
      raise exception 'current writing version has not been evaluated' using errcode = '22023';
    end if;

    if exists (
      select 1 from public.writing_versions
      where id = v_submission.current_version_id and text_de = p_text_de
    ) then
      raise exception 'rewritten text must differ from the current version' using errcode = '22023';
    end if;

    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.writing_versions where submission_id = v_submission.id;

    if v_version_number > 10 then
      raise exception 'writing submission has reached the version limit' using errcode = '22023';
    end if;

    v_previous_version_id := v_submission.current_version_id;
  end if;

  insert into public.writing_versions (
    user_id,
    submission_id,
    previous_version_id,
    version_number,
    text_de,
    word_count,
    diff_json,
    idempotency_key
  ) values (
    p_user_id,
    v_submission.id,
    v_previous_version_id,
    v_version_number,
    p_text_de,
    p_word_count,
    p_diff_json,
    p_idempotency_key
  ) returning id into v_version_id;

  update public.writing_submissions
  set current_version_id = v_version_id, status = 'evaluating'
  where id = v_submission.id;

  return jsonb_build_object(
    'submissionId', v_submission.id,
    'versionId', v_version_id,
    'versionNumber', v_version_number,
    'previousVersionId', v_previous_version_id,
    'feedbackId', null,
    'created', true
  );
end;
$$;

create or replace function public.record_writing_feedback(
  p_user_id uuid,
  p_version_id uuid,
  p_feedback_json jsonb,
  p_model text,
  p_schema_version text,
  p_prompt_id text,
  p_prompt_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version public.writing_versions%rowtype;
  v_feedback_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  perform set_config('app.current_profile_id', p_user_id::text, true);

  select * into v_version
  from public.writing_versions
  where id = p_version_id and user_id = p_user_id
  for update;

  if v_version.id is null then
    raise exception 'owned writing version was not found' using errcode = '22023';
  end if;

  if v_version.ai_feedback_id is not null then
    return jsonb_build_object(
      'feedbackId', v_version.ai_feedback_id,
      'idempotentReplay', true
    );
  end if;

  if jsonb_typeof(p_feedback_json) <> 'object'
    or jsonb_typeof(p_feedback_json -> 'rubricScores') <> 'object'
    or jsonb_typeof(p_feedback_json -> 'inlineErrors') <> 'array'
    or not (p_feedback_json ? 'score')
    or not (p_feedback_json ? 'referenceVersion') then
    raise exception 'writing feedback is incomplete' using errcode = '22023';
  end if;

  if v_version.version_number = 1
    and jsonb_typeof(p_feedback_json -> 'referenceVersion') <> 'null' then
    raise exception 'first writing pass cannot contain a reference version' using errcode = '22023';
  end if;

  if v_version.version_number >= 2
    and nullif(trim(p_feedback_json ->> 'referenceVersion'), '') is null then
    raise exception 'rewritten writing feedback requires a reference version' using errcode = '22023';
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
    idempotency_key
  ) values (
    p_user_id,
    null,
    'evaluate_writing',
    'writing_version',
    v_version.id,
    p_schema_version,
    p_prompt_id,
    p_prompt_version,
    p_model,
    p_feedback_json,
    coalesce((p_feedback_json ->> 'requiresHumanReview')::boolean, false),
    'writing-version:' || v_version.id::text,
    v_version.idempotency_key
  ) returning id into v_feedback_id;

  update public.writing_versions
  set ai_feedback_id = v_feedback_id
  where id = v_version.id;

  update public.writing_submissions
  set status = case
    when v_version.version_number = 1 then 'revision_requested'::public.writing_submission_status
    else 'completed'::public.writing_submission_status
  end
  where id = v_version.submission_id;

  return jsonb_build_object('feedbackId', v_feedback_id, 'idempotentReplay', false);
end;
$$;

create or replace function public.mark_writing_evaluation_failed(
  p_user_id uuid,
  p_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  update public.writing_submissions
  set status = 'evaluation_failed'
  where user_id = p_user_id
    and current_version_id = p_version_id
    and exists (
      select 1 from public.writing_versions
      where writing_versions.id = p_version_id
        and writing_versions.user_id = p_user_id
        and writing_versions.ai_feedback_id is null
    );
end;
$$;

create or replace function public.delete_own_writing_submission(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := public.current_profile_id();
begin
  if v_user_id is null then
    raise exception 'authenticated profile is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.writing_submissions
    where id = p_submission_id and user_id = v_user_id
  ) then
    raise exception 'owned writing submission was not found' using errcode = '22023';
  end if;

  delete from public.ai_feedback
  where user_id = v_user_id
    and feature = 'evaluate_writing'
    and target_id in (
      select id from public.writing_versions where submission_id = p_submission_id
    );

  delete from public.writing_submissions
  where id = p_submission_id and user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.prepare_writing_version(
  uuid, uuid, uuid, uuid, text, integer, jsonb, text
) from public, anon, authenticated;
revoke all on function public.record_writing_feedback(
  uuid, uuid, jsonb, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.mark_writing_evaluation_failed(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.delete_own_writing_submission(uuid)
from public, anon;

grant execute on function public.prepare_writing_version(
  uuid, uuid, uuid, uuid, text, integer, jsonb, text
) to service_role;
grant execute on function public.record_writing_feedback(
  uuid, uuid, jsonb, text, text, text, text
) to service_role;
grant execute on function public.mark_writing_evaluation_failed(uuid, uuid)
to service_role;
grant execute on function public.delete_own_writing_submission(uuid)
to authenticated;
