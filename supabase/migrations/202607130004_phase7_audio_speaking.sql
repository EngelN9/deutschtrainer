create type public.listening_kind as enum (
  'sentence',
  'dialogue',
  'announcement',
  'interview',
  'news',
  'lecture',
  'academic',
  'discussion'
);
create type public.audio_source_type as enum ('uploaded', 'generated', 'licensed');
create type public.speaking_submission_status as enum (
  'transcribing',
  'completed',
  'transcription_failed'
);

create table public.listening_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  level public.cefr_level not null,
  kind public.listening_kind not null,
  title_zh_tw text not null,
  description_zh_tw text not null,
  estimated_seconds integer not null check (estimated_seconds between 1 and 1800),
  keyword_hints_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(keyword_hints_json) = 'array'),
  comprehension_question_zh_tw text not null,
  comprehension_options_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(comprehension_options_json) = 'array'),
  skill_ids text[] not null check (cardinality(skill_ids) > 0),
  tts_voice text not null default 'marin' check (tts_voice in ('marin', 'cedar')),
  source_type public.source_type not null default 'human',
  review_status public.review_status not null default 'draft',
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index listening_assets_level_status_idx
on public.listening_assets(level, status) where deleted_at is null;

create table public.listening_asset_content (
  asset_id uuid primary key references public.listening_assets(id) on delete cascade,
  transcript_de text not null check (char_length(trim(transcript_de)) between 1 and 4096),
  comprehension_correct_option text not null check (char_length(comprehension_correct_option) between 1 and 20),
  tts_instructions text not null default 'Sprich klares, natuerliches Hochdeutsch.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete cascade,
  listening_asset_id uuid references public.listening_assets(id) on delete cascade,
  storage_bucket text not null check (storage_bucket in ('listening-audio', 'speaking-audio')),
  storage_path text not null check (char_length(storage_path) between 3 and 500),
  source_type public.audio_source_type not null,
  license text not null check (char_length(license) between 3 and 200),
  content_type text not null check (content_type like 'audio/%'),
  duration_ms integer not null default 0 check (duration_ms between 0 and 1800000),
  voice text,
  model text,
  cache_key text unique,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (
    (
      source_type = 'uploaded'
      and owner_user_id is not null
      and listening_asset_id is null
      and storage_bucket = 'speaking-audio'
    )
    or (
      source_type in ('generated', 'licensed')
      and owner_user_id is null
      and listening_asset_id is not null
      and storage_bucket = 'listening-audio'
    )
  )
);

create index audio_assets_owner_created_idx
on public.audio_assets(owner_user_id, created_at desc) where owner_user_id is not null;
create index audio_assets_listening_idx
on public.audio_assets(listening_asset_id, created_at desc) where listening_asset_id is not null;

create table public.listening_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listening_asset_id uuid not null references public.listening_assets(id) on delete cascade,
  session_key text not null check (char_length(session_key) between 12 and 200),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  play_count integer not null default 0 check (play_count between 0 and 1000),
  used_slow_speed boolean not null default false,
  transcript_viewed boolean not null default false,
  dictation_text text,
  dictation_score integer check (dictation_score between 0 and 100),
  comprehension_answer text,
  comprehension_correct boolean,
  difficult_words text[] not null default '{}',
  idempotency_key text check (
    idempotency_key is null or char_length(idempotency_key) between 12 and 200
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_key),
  unique (user_id, idempotency_key)
);

create index listening_attempts_user_updated_idx
on public.listening_attempts(user_id, updated_at desc);

create table public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  level public.cefr_level not null,
  title_zh_tw text not null,
  instruction_zh_tw text not null,
  target_de text not null check (char_length(trim(target_de)) between 1 and 1200),
  translation_zh_tw text not null,
  skill_ids text[] not null check (cardinality(skill_ids) > 0),
  maximum_seconds integer not null default 90 check (maximum_seconds between 5 and 300),
  source_type public.source_type not null default 'human',
  review_status public.review_status not null default 'draft',
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index speaking_prompts_level_status_idx
on public.speaking_prompts(level, status) where deleted_at is null;

create table public.speaking_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  speaking_prompt_id uuid not null references public.speaking_prompts(id) on delete cascade,
  audio_asset_id uuid not null unique references public.audio_assets(id) on delete cascade,
  status public.speaking_submission_status not null default 'transcribing',
  transcript_de text,
  word_timings_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(word_timings_json) = 'array'),
  comparison_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(comparison_json) = 'array'),
  feedback_json jsonb,
  words_per_minute numeric(7, 2) check (words_per_minute between 0 and 1000),
  model text,
  error_code text,
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index speaking_submissions_user_created_idx
on public.speaking_submissions(user_id, created_at desc);

create trigger listening_assets_set_updated_at
before update on public.listening_assets
for each row execute function public.set_updated_at();
create trigger listening_asset_content_set_updated_at
before update on public.listening_asset_content
for each row execute function public.set_updated_at();
create trigger listening_attempts_set_updated_at
before update on public.listening_attempts
for each row execute function public.set_updated_at();
create trigger speaking_prompts_set_updated_at
before update on public.speaking_prompts
for each row execute function public.set_updated_at();
create trigger speaking_submissions_set_updated_at
before update on public.speaking_submissions
for each row execute function public.set_updated_at();

alter table public.listening_assets enable row level security;
alter table public.listening_asset_content enable row level security;
alter table public.audio_assets enable row level security;
alter table public.listening_attempts enable row level security;
alter table public.speaking_prompts enable row level security;
alter table public.speaking_submissions enable row level security;

create policy "published listening assets are readable"
on public.listening_assets for select to anon, authenticated
using (
  status = 'published'
  and review_status = 'approved'
  and deleted_at is null
  and exists (
    select 1 from public.lessons
    where lessons.id = listening_assets.lesson_id
      and lessons.status = 'published'
      and lessons.deleted_at is null
  )
);

create policy "published speaking prompts are readable"
on public.speaking_prompts for select to anon, authenticated
using (
  status = 'published'
  and review_status = 'approved'
  and deleted_at is null
  and exists (
    select 1 from public.lessons
    where lessons.id = speaking_prompts.lesson_id
      and lessons.status = 'published'
      and lessons.deleted_at is null
  )
);

create policy "learners read own listening attempts"
on public.listening_attempts for select to authenticated
using (user_id = public.current_profile_id());

create policy "learners read own speaking submissions"
on public.speaking_submissions for select to authenticated
using (user_id = public.current_profile_id());

create policy "learners read own uploaded audio metadata"
on public.audio_assets for select to authenticated
using (owner_user_id = public.current_profile_id());

grant select on table public.listening_assets, public.speaking_prompts to anon, authenticated;
grant select on table
  public.audio_assets,
  public.listening_attempts,
  public.speaking_submissions
to authenticated;

grant select, insert, update, delete on table
  public.audio_assets,
  public.listening_attempts,
  public.speaking_submissions
to service_role;
grant select on table
  public.listening_assets,
  public.listening_asset_content,
  public.speaking_prompts
to service_role;

alter table public.ai_usage_logs drop constraint ai_usage_logs_feature_check;
alter table public.ai_usage_logs add constraint ai_usage_logs_feature_check check (
  feature in ('evaluate_response', 'evaluate_writing', 'text_to_speech', 'transcribe_audio')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listening-audio', 'listening-audio', false, 10485760, array['audio/wav', 'audio/mpeg']),
  (
    'speaking-audio',
    'speaking-audio',
    false,
    10485760,
    array['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/webm', 'audio/wav', 'audio/x-m4a']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "learners upload own speaking audio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "learners read own speaking audio"
on storage.objects for select to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "learners delete own speaking audio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.record_listening_activity(
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
declare
  v_user_id uuid := public.current_profile_id();
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'authenticated profile is required' using errcode = '42501';
  end if;
  if char_length(p_session_key) not between 12 and 200 then
    raise exception 'invalid listening session key' using errcode = '22023';
  end if;
  if p_play_increment not between 0 and 20 then
    raise exception 'invalid play increment' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.listening_assets
    where id = p_listening_asset_id
      and status = 'published'
      and review_status = 'approved'
      and deleted_at is null
  ) then
    raise exception 'published listening asset was not found' using errcode = '22023';
  end if;

  insert into public.listening_attempts (
    user_id,
    listening_asset_id,
    session_key,
    play_count,
    used_slow_speed,
    transcript_viewed
  ) values (
    v_user_id,
    p_listening_asset_id,
    p_session_key,
    p_play_increment,
    p_used_slow_speed,
    p_transcript_viewed
  )
  on conflict (user_id, session_key) do update
  set
    play_count = least(1000, listening_attempts.play_count + excluded.play_count),
    used_slow_speed = listening_attempts.used_slow_speed or excluded.used_slow_speed,
    transcript_viewed = listening_attempts.transcript_viewed or excluded.transcript_viewed
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

create or replace function public.record_listening_result(
  p_user_id uuid,
  p_listening_asset_id uuid,
  p_session_key text,
  p_dictation_text text,
  p_dictation_score integer,
  p_comprehension_answer text,
  p_comprehension_correct boolean,
  p_difficult_words text[],
  p_play_count integer,
  p_used_slow_speed boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.listening_attempts%rowtype;
  v_attempt_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;
  if p_dictation_score not between 0 and 100
    or p_play_count not between 0 and 1000
    or nullif(trim(p_dictation_text), '') is null
    or char_length(p_idempotency_key) not between 12 and 200 then
    raise exception 'invalid listening result' using errcode = '22023';
  end if;

  select * into v_existing
  from public.listening_attempts
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    return jsonb_build_object('attemptId', v_existing.id, 'idempotentReplay', true);
  end if;

  insert into public.listening_attempts (
    user_id,
    listening_asset_id,
    session_key,
    status,
    play_count,
    used_slow_speed,
    transcript_viewed,
    dictation_text,
    dictation_score,
    comprehension_answer,
    comprehension_correct,
    difficult_words,
    idempotency_key
  ) values (
    p_user_id,
    p_listening_asset_id,
    p_session_key,
    'completed',
    p_play_count,
    p_used_slow_speed,
    true,
    p_dictation_text,
    p_dictation_score,
    p_comprehension_answer,
    p_comprehension_correct,
    coalesce(p_difficult_words, '{}'),
    p_idempotency_key
  )
  on conflict (user_id, session_key) do update
  set
    status = 'completed',
    play_count = greatest(listening_attempts.play_count, excluded.play_count),
    used_slow_speed = listening_attempts.used_slow_speed or excluded.used_slow_speed,
    transcript_viewed = true,
    dictation_text = excluded.dictation_text,
    dictation_score = excluded.dictation_score,
    comprehension_answer = excluded.comprehension_answer,
    comprehension_correct = excluded.comprehension_correct,
    difficult_words = excluded.difficult_words,
    idempotency_key = excluded.idempotency_key
  returning id into v_attempt_id;

  return jsonb_build_object('attemptId', v_attempt_id, 'idempotentReplay', false);
end;
$$;

create or replace function public.prepare_speaking_submission(
  p_user_id uuid,
  p_speaking_prompt_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_duration_ms integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_audio_asset_id uuid;
  v_submission_id uuid;
  v_existing public.speaking_submissions%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  select auth_user_id into v_auth_user_id
  from public.profiles where id = p_user_id and deleted_at is null;
  if v_auth_user_id is null then
    raise exception 'active learner profile was not found' using errcode = '22023';
  end if;

  select * into v_existing
  from public.speaking_submissions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    return jsonb_build_object(
      'submissionId', v_existing.id,
      'audioAssetId', v_existing.audio_asset_id,
      'created', false
    );
  end if;

  if p_storage_path not like v_auth_user_id::text || '/%'
    or p_mime_type not in (
      'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/webm', 'audio/wav', 'audio/x-m4a'
    )
    or p_duration_ms not between 500 and 120000
    or char_length(p_idempotency_key) not between 12 and 200 then
    raise exception 'invalid speaking recording metadata' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.speaking_prompts
    where id = p_speaking_prompt_id
      and status = 'published'
      and review_status = 'approved'
      and deleted_at is null
  ) then
    raise exception 'published speaking prompt was not found' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'speaking-audio'
      and name = p_storage_path
      and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
  ) then
    raise exception 'speaking audio object was not found' using errcode = '22023';
  end if;

  insert into public.audio_assets (
    owner_user_id,
    storage_bucket,
    storage_path,
    source_type,
    license,
    content_type,
    duration_ms
  ) values (
    p_user_id,
    'speaking-audio',
    p_storage_path,
    'uploaded',
    'user_recording_private',
    p_mime_type,
    p_duration_ms
  ) returning id into v_audio_asset_id;

  insert into public.speaking_submissions (
    user_id,
    speaking_prompt_id,
    audio_asset_id,
    status,
    idempotency_key
  ) values (
    p_user_id,
    p_speaking_prompt_id,
    v_audio_asset_id,
    'transcribing',
    p_idempotency_key
  ) returning id into v_submission_id;

  return jsonb_build_object(
    'submissionId', v_submission_id,
    'audioAssetId', v_audio_asset_id,
    'created', true
  );
end;
$$;

create or replace function public.record_speaking_result(
  p_user_id uuid,
  p_submission_id uuid,
  p_transcript_de text,
  p_word_timings_json jsonb,
  p_comparison_json jsonb,
  p_feedback_json jsonb,
  p_words_per_minute numeric,
  p_model text
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
  if nullif(trim(p_transcript_de), '') is null
    or jsonb_typeof(p_word_timings_json) <> 'array'
    or jsonb_typeof(p_comparison_json) <> 'array'
    or jsonb_typeof(p_feedback_json) <> 'object'
    or not (p_feedback_json ? 'disclaimerZhTw')
    or p_words_per_minute not between 0 and 1000 then
    raise exception 'invalid speaking result' using errcode = '22023';
  end if;

  update public.speaking_submissions
  set
    status = 'completed',
    transcript_de = p_transcript_de,
    word_timings_json = p_word_timings_json,
    comparison_json = p_comparison_json,
    feedback_json = p_feedback_json,
    words_per_minute = p_words_per_minute,
    model = p_model,
    error_code = null
  where id = p_submission_id and user_id = p_user_id;

  if not found then
    raise exception 'owned speaking submission was not found' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.mark_speaking_transcription_failed(
  p_user_id uuid,
  p_submission_id uuid,
  p_error_code text
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

  update public.speaking_submissions
  set status = 'transcription_failed', error_code = p_error_code
  where id = p_submission_id and user_id = p_user_id and status = 'transcribing';
end;
$$;

revoke all on function public.record_listening_activity(uuid, text, integer, boolean, boolean)
from public, anon;
revoke all on function public.record_listening_result(
  uuid, uuid, text, text, integer, text, boolean, text[], integer, boolean, text
) from public, anon, authenticated;
revoke all on function public.prepare_speaking_submission(
  uuid, uuid, text, text, integer, text
) from public, anon, authenticated;
revoke all on function public.record_speaking_result(
  uuid, uuid, text, jsonb, jsonb, jsonb, numeric, text
) from public, anon, authenticated;
revoke all on function public.mark_speaking_transcription_failed(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.record_listening_activity(uuid, text, integer, boolean, boolean)
to authenticated;
grant execute on function public.record_listening_result(
  uuid, uuid, text, text, integer, text, boolean, text[], integer, boolean, text
) to service_role;
grant execute on function public.prepare_speaking_submission(
  uuid, uuid, text, text, integer, text
) to service_role;
grant execute on function public.record_speaking_result(
  uuid, uuid, text, jsonb, jsonb, jsonb, numeric, text
) to service_role;
grant execute on function public.mark_speaking_transcription_failed(uuid, uuid, text)
to service_role;
