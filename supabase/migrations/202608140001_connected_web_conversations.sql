alter table public.ai_quota_reservations
drop constraint if exists ai_quota_reservations_feature_check;

alter table public.ai_quota_reservations
add constraint ai_quota_reservations_feature_check check (
  feature in (
    'evaluate_response',
    'evaluate_writing',
    'text_to_speech',
    'transcribe_audio',
    'conversation'
  )
);

alter table public.ai_provider_call_reservations
drop constraint if exists ai_provider_call_reservations_provider_attempt_check;

alter table public.ai_provider_call_reservations
add constraint ai_provider_call_reservations_provider_attempt_check
check (provider_attempt between 1 and 7);

create type public.conversation_session_status as enum (
  'active',
  'completed',
  'failed'
);

create table public.conversation_scenarios (
  id uuid primary key default gen_random_uuid(),
  level public.cefr_level not null,
  title_zh_tw text not null check (char_length(title_zh_tw) between 1 and 120),
  title_de text not null check (char_length(title_de) between 1 and 120),
  description_zh_tw text not null check (char_length(description_zh_tw) between 1 and 1000),
  opening_message_de text not null check (char_length(opening_message_de) between 1 and 2000),
  max_learner_turns integer not null default 6 check (max_learner_turns = 6),
  status public.content_status not null default 'draft',
  review_status public.review_status not null default 'pending_review',
  source_type public.source_type not null default 'human',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, version)
);

create table public.conversation_scenario_rules (
  scenario_id uuid primary key references public.conversation_scenarios(id) on delete cascade,
  goals_json jsonb not null check (jsonb_typeof(goals_json) = 'array'),
  evaluation_notes_zh_tw text not null check (char_length(evaluation_notes_zh_tw) between 1 and 4000),
  allowed_skill_ids text[] not null check (cardinality(allowed_skill_ids) between 1 and 20),
  updated_at timestamptz not null default now()
);

create table public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id uuid not null references public.conversation_scenarios(id) on delete restrict,
  scenario_version integer not null check (scenario_version > 0),
  status public.conversation_session_status not null default 'active',
  learner_turn_count integer not null default 0 check (learner_turn_count between 0 and 6),
  idempotency_key text not null check (char_length(idempotency_key) between 12 and 200),
  quota_reservation_id uuid not null references public.ai_quota_reservations(id) on delete restrict,
  quota_generation integer not null check (quota_generation > 0),
  provider_call_count integer not null default 0 check (provider_call_count between 0 and 7),
  retry_of_session_id uuid references public.conversation_sessions(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create unique index conversation_sessions_one_active_per_user_idx
on public.conversation_sessions(user_id)
where status = 'active';

create index conversation_sessions_user_updated_idx
on public.conversation_sessions(user_id, updated_at desc);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  sequence_number integer not null check (sequence_number >= 0),
  content text not null check (char_length(content) between 1 and 2000),
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number),
  unique (session_id, idempotency_key)
);

create index conversation_messages_session_sequence_idx
on public.conversation_messages(session_id, sequence_number);

create table public.conversation_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.conversation_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  feedback_json jsonb not null check (jsonb_typeof(feedback_json) = 'object'),
  model text not null,
  schema_version text not null,
  prompt_id text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

create trigger conversation_scenarios_set_updated_at
before update on public.conversation_scenarios
for each row execute function public.set_updated_at();

create trigger conversation_scenario_rules_set_updated_at
before update on public.conversation_scenario_rules
for each row execute function public.set_updated_at();

create trigger conversation_sessions_set_updated_at
before update on public.conversation_sessions
for each row execute function public.set_updated_at();

alter table public.conversation_scenarios enable row level security;
alter table public.conversation_scenario_rules enable row level security;
alter table public.conversation_sessions enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.conversation_feedback enable row level security;

create policy "published conversation scenarios are readable"
on public.conversation_scenarios for select to authenticated
using (
  status = 'published'
  and review_status = 'approved'
  and deleted_at is null
);

create policy "learners read own conversation sessions"
on public.conversation_sessions for select to authenticated
using (
  user_id = public.current_profile_id()
  and exists (
    select 1
    from public.profiles
    where profiles.id = public.current_profile_id()
      and profiles.role = 'learner'
      and profiles.deleted_at is null
  )
);

create policy "learners read own conversation messages"
on public.conversation_messages for select to authenticated
using (
  user_id = public.current_profile_id()
  and exists (
    select 1
    from public.profiles
    where profiles.id = public.current_profile_id()
      and profiles.role = 'learner'
      and profiles.deleted_at is null
  )
);

create policy "learners read own conversation feedback"
on public.conversation_feedback for select to authenticated
using (
  user_id = public.current_profile_id()
  and exists (
    select 1
    from public.profiles
    where profiles.id = public.current_profile_id()
      and profiles.role = 'learner'
      and profiles.deleted_at is null
  )
);

revoke all on table public.conversation_scenarios from public, anon, authenticated;
revoke all on table public.conversation_scenario_rules from public, anon, authenticated;
revoke all on table public.conversation_sessions from public, anon, authenticated;
revoke all on table public.conversation_messages from public, anon, authenticated;
revoke all on table public.conversation_feedback from public, anon, authenticated;

grant select on table public.conversation_scenarios to authenticated;
grant select on table public.conversation_sessions to authenticated;
grant select on table public.conversation_messages to authenticated;
grant select on table public.conversation_feedback to authenticated;
grant select, insert, update, delete on table public.conversation_scenarios to service_role;
grant select, insert, update, delete on table public.conversation_scenario_rules to service_role;
grant select, insert, update, delete on table public.conversation_sessions to service_role;
grant select, insert, update, delete on table public.conversation_messages to service_role;
grant select, insert, update, delete on table public.conversation_feedback to service_role;

create or replace function public.reserve_ai_quota_service(
  p_user_id uuid,
  p_feature text,
  p_idempotency_key text,
  p_user_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_existing public.ai_quota_reservations%rowtype;
  v_reservation public.ai_quota_reservations%rowtype;
  v_used integer;
  v_resets_at timestamptz;
  v_expiry interval := case when p_feature = 'conversation' then interval '60 minutes' else interval '10 minutes' end;
begin
  if p_feature not in (
    'evaluate_response', 'evaluate_writing', 'text_to_speech', 'transcribe_audio', 'conversation'
  ) then
    raise exception using errcode = '22023', message = 'unsupported AI quota feature';
  end if;
  if char_length(p_idempotency_key) not between 12 and 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_user_limit < 1 or p_user_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid user quota limit';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'learner' and deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'active learner profile required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_feature, 0));
  select * into v_existing from public.ai_quota_reservations
  where user_id = p_user_id and feature = p_feature and idempotency_key = p_idempotency_key;

  if found and v_existing.status = 'consumed' then
    return jsonb_build_object('allowed', false, 'reason', 'ALREADY_CONSUMED', 'reservationId', v_existing.id, 'generation', v_existing.generation);
  end if;
  if found and v_existing.status = 'reserved' and v_existing.expires_at > v_now then
    return jsonb_build_object('allowed', false, 'reason', 'IN_PROGRESS', 'reservationId', v_existing.id, 'generation', v_existing.generation);
  end if;

  select count(*)::integer, min(case when status = 'reserved' then least(reserved_at + interval '24 hours', expires_at) else reserved_at + interval '24 hours' end)
  into v_used, v_resets_at
  from public.ai_quota_reservations
  where user_id = p_user_id and feature = p_feature
    and id <> coalesce(v_existing.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and reserved_at >= v_now - interval '24 hours'
    and (status = 'consumed' or (status = 'reserved' and expires_at > v_now));

  if v_used >= p_user_limit then
    return jsonb_build_object('allowed', false, 'reason', 'USER_LIMIT', 'used', v_used, 'resetsAt', v_resets_at);
  end if;

  if v_existing.id is null then
    insert into public.ai_quota_reservations (user_id, feature, idempotency_key, status, generation, reserved_at, expires_at)
    values (p_user_id, p_feature, p_idempotency_key, 'reserved', 1, v_now, v_now + v_expiry)
    returning * into v_reservation;
  else
    update public.ai_quota_reservations
    set status = 'reserved', generation = generation + 1, reserved_at = v_now,
        expires_at = v_now + v_expiry, finalized_at = null
    where id = v_existing.id returning * into v_reservation;
  end if;

  return jsonb_build_object('allowed', true, 'reservationId', v_reservation.id,
    'generation', v_reservation.generation, 'used', v_used + 1,
    'resetsAt', coalesce(v_resets_at, v_reservation.reserved_at + interval '24 hours'));
end;
$$;

revoke all on function public.reserve_ai_quota_service(uuid, text, text, integer)
from public, anon, authenticated;
grant execute on function public.reserve_ai_quota_service(uuid, text, text, integer)
to service_role;

create or replace function public.create_conversation_session_service(
  p_user_id uuid,
  p_scenario_id uuid,
  p_idempotency_key text,
  p_quota_reservation_id uuid,
  p_quota_generation integer,
  p_retry_of_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_scenario_version integer;
  v_opening_message text;
begin
  perform pg_advisory_xact_lock(hashtextextended('conversation:' || p_user_id::text, 0));
  select id into v_session_id from public.conversation_sessions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return v_session_id; end if;
  if exists (select 1 from public.conversation_sessions where user_id = p_user_id and status = 'active') then
    raise exception using errcode = '23505', message = 'active conversation already exists';
  end if;
  select version, opening_message_de into v_scenario_version, v_opening_message
  from public.conversation_scenarios
  where id = p_scenario_id and status = 'published' and review_status = 'approved' and deleted_at is null;
  if not found then raise exception using errcode = '22023', message = 'published conversation scenario not found'; end if;
  if not exists (
    select 1 from public.ai_quota_reservations
    where id = p_quota_reservation_id and user_id = p_user_id and feature = 'conversation'
      and generation = p_quota_generation and status = 'reserved' and expires_at > clock_timestamp()
  ) then raise exception using errcode = '22023', message = 'active conversation quota reservation required'; end if;
  if p_retry_of_session_id is not null and not exists (
    select 1 from public.conversation_sessions where id = p_retry_of_session_id and user_id = p_user_id and status <> 'active'
  ) then raise exception using errcode = '42501', message = 'owned completed retry session required'; end if;

  insert into public.conversation_sessions (
    user_id, scenario_id, scenario_version, idempotency_key, quota_reservation_id,
    quota_generation, retry_of_session_id
  ) values (
    p_user_id, p_scenario_id, v_scenario_version, p_idempotency_key, p_quota_reservation_id,
    p_quota_generation, p_retry_of_session_id
  ) returning id into v_session_id;
  insert into public.conversation_messages (session_id, user_id, role, sequence_number, content)
  values (v_session_id, p_user_id, 'assistant', 0, v_opening_message);
  return v_session_id;
end;
$$;

create or replace function public.append_conversation_turn_service(
  p_user_id uuid,
  p_session_id uuid,
  p_expected_learner_turn integer,
  p_idempotency_key text,
  p_user_content text,
  p_assistant_content text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_session public.conversation_sessions%rowtype;
begin
  select * into v_session from public.conversation_sessions
  where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = '42501', message = 'owned conversation not found'; end if;
  if exists (select 1 from public.conversation_messages where session_id = p_session_id and idempotency_key = p_idempotency_key) then return; end if;
  if v_session.status <> 'active' or v_session.learner_turn_count <> p_expected_learner_turn or v_session.learner_turn_count >= 6 then
    raise exception using errcode = '40001', message = 'conversation turn conflict';
  end if;
  insert into public.conversation_messages (session_id, user_id, role, sequence_number, content, idempotency_key)
  values (p_session_id, p_user_id, 'user', v_session.learner_turn_count * 2 + 1, p_user_content, p_idempotency_key),
         (p_session_id, p_user_id, 'assistant', v_session.learner_turn_count * 2 + 2, p_assistant_content, null);
  update public.conversation_sessions
  set learner_turn_count = learner_turn_count + 1,
      provider_call_count = provider_call_count + 1
  where id = p_session_id;
end;
$$;

create or replace function public.complete_conversation_session_service(
  p_user_id uuid,
  p_session_id uuid,
  p_feedback jsonb,
  p_model text,
  p_schema_version text,
  p_prompt_id text,
  p_prompt_version text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_session public.conversation_sessions%rowtype;
begin
  select * into v_session from public.conversation_sessions
  where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = '42501', message = 'owned conversation not found'; end if;
  if v_session.status = 'completed' then return; end if;
  if v_session.status <> 'active' or v_session.learner_turn_count < 1 then
    raise exception using errcode = '22023', message = 'active conversation with at least one turn required';
  end if;
  insert into public.conversation_feedback (
    session_id, user_id, feedback_json, model, schema_version, prompt_id, prompt_version
  ) values (p_session_id, p_user_id, p_feedback, p_model, p_schema_version, p_prompt_id, p_prompt_version);
  update public.conversation_sessions
  set status = 'completed', completed_at = clock_timestamp(), provider_call_count = provider_call_count + 1
  where id = p_session_id;
end;
$$;

create or replace function public.fail_conversation_session_service(p_user_id uuid, p_session_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$
  update public.conversation_sessions set status = 'failed'
  where id = p_session_id and user_id = p_user_id and status = 'active';
$$;

create or replace function public.delete_conversation_session_service(p_user_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.conversation_sessions where id = p_session_id and user_id = p_user_id) then
    raise exception using errcode = '42501', message = 'owned conversation not found';
  end if;
  delete from public.conversation_sessions where id = p_session_id and user_id = p_user_id;
end;
$$;

revoke all on function public.create_conversation_session_service(uuid, uuid, text, uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.append_conversation_turn_service(uuid, uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.complete_conversation_session_service(uuid, uuid, jsonb, text, text, text, text) from public, anon, authenticated;
revoke all on function public.fail_conversation_session_service(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_conversation_session_service(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_conversation_session_service(uuid, uuid, text, uuid, integer, uuid) to service_role;
grant execute on function public.append_conversation_turn_service(uuid, uuid, integer, text, text, text) to service_role;
grant execute on function public.complete_conversation_session_service(uuid, uuid, jsonb, text, text, text, text) to service_role;
grant execute on function public.fail_conversation_session_service(uuid, uuid) to service_role;
grant execute on function public.delete_conversation_session_service(uuid, uuid) to service_role;
