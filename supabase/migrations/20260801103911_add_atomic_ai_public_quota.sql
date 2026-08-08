create table public.ai_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (
    feature in ('evaluate_response', 'evaluate_writing', 'text_to_speech', 'transcribe_audio')
  ),
  idempotency_key text not null check (
    char_length(idempotency_key) between 12 and 200
  ),
  status text not null default 'reserved' check (
    status in ('reserved', 'consumed', 'released')
  ),
  generation integer not null default 1 check (generation > 0),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  finalized_at timestamptz,
  unique (user_id, feature, idempotency_key)
);

create index ai_quota_reservations_user_window_idx
on public.ai_quota_reservations(user_id, feature, reserved_at desc)
where status in ('reserved', 'consumed');

create table public.ai_provider_call_reservations (
  id uuid primary key default gen_random_uuid(),
  quota_reservation_id uuid not null references public.ai_quota_reservations(id) on delete cascade,
  generation integer not null check (generation > 0),
  provider_attempt integer not null check (provider_attempt between 1 and 5),
  created_at timestamptz not null default now(),
  unique (quota_reservation_id, generation, provider_attempt)
);

create index ai_provider_call_reservations_global_day_idx
on public.ai_provider_call_reservations(created_at desc);

alter table public.ai_quota_reservations enable row level security;
alter table public.ai_provider_call_reservations enable row level security;

revoke all on table public.ai_quota_reservations from public, anon, authenticated;
revoke all on table public.ai_provider_call_reservations from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_quota_reservations to service_role;
grant select, insert, update, delete on table public.ai_provider_call_reservations to service_role;

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
begin
  if p_feature not in (
    'evaluate_response',
    'evaluate_writing',
    'text_to_speech',
    'transcribe_audio'
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
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'learner'
      and deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'active learner profile required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_feature, 0));

  select *
  into v_existing
  from public.ai_quota_reservations
  where user_id = p_user_id
    and feature = p_feature
    and idempotency_key = p_idempotency_key;

  if found and v_existing.status = 'consumed' then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'ALREADY_CONSUMED',
      'reservationId', v_existing.id,
      'generation', v_existing.generation
    );
  end if;

  if found and v_existing.status = 'reserved' and v_existing.expires_at > v_now then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'IN_PROGRESS',
      'reservationId', v_existing.id,
      'generation', v_existing.generation
    );
  end if;

  select
    count(*)::integer,
    min(
      case
        when status = 'reserved' then least(reserved_at + interval '24 hours', expires_at)
        else reserved_at + interval '24 hours'
      end
    )
  into v_used, v_resets_at
  from public.ai_quota_reservations
  where user_id = p_user_id
    and feature = p_feature
    and id <> coalesce(v_existing.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and reserved_at >= v_now - interval '24 hours'
    and (
      status = 'consumed'
      or (status = 'reserved' and expires_at > v_now)
    );

  if v_used >= p_user_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'USER_LIMIT',
      'used', v_used,
      'resetsAt', v_resets_at
    );
  end if;

  if v_existing.id is null then
    insert into public.ai_quota_reservations (
      user_id,
      feature,
      idempotency_key,
      status,
      generation,
      reserved_at,
      expires_at
    ) values (
      p_user_id,
      p_feature,
      p_idempotency_key,
      'reserved',
      1,
      v_now,
      v_now + interval '10 minutes'
    )
    returning * into v_reservation;
  else
    update public.ai_quota_reservations
    set status = 'reserved',
        generation = generation + 1,
        reserved_at = v_now,
        expires_at = v_now + interval '10 minutes',
        finalized_at = null
    where id = v_existing.id
    returning * into v_reservation;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reservationId', v_reservation.id,
    'generation', v_reservation.generation,
    'used', v_used + 1,
    'resetsAt', coalesce(v_resets_at, v_reservation.reserved_at + interval '24 hours')
  );
end;
$$;

create or replace function public.reserve_ai_provider_call_service(
  p_reservation_id uuid,
  p_generation integer,
  p_provider_attempt integer,
  p_global_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_global_used integer;
begin
  if p_generation < 1 or p_provider_attempt not between 1 and 5 then
    raise exception using errcode = '22023', message = 'invalid provider call generation or attempt';
  end if;
  if p_global_limit < 1 or p_global_limit > 100000 then
    raise exception using errcode = '22023', message = 'invalid global provider call limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ai-provider-global-day', 0));

  if not exists (
    select 1
    from public.ai_quota_reservations
    where id = p_reservation_id
      and generation = p_generation
      and status = 'reserved'
      and expires_at > v_now
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'RESERVATION_INACTIVE');
  end if;

  if exists (
    select 1
    from public.ai_provider_call_reservations
    where quota_reservation_id = p_reservation_id
      and generation = p_generation
      and provider_attempt = p_provider_attempt
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'ATTEMPT_ALREADY_RESERVED');
  end if;

  select count(*)::integer
  into v_global_used
  from public.ai_provider_call_reservations
  where created_at >= v_day_start;

  if v_global_used >= p_global_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'GLOBAL_LIMIT',
      'globalUsed', v_global_used,
      'resetsAt', v_day_start + interval '1 day'
    );
  end if;

  insert into public.ai_provider_call_reservations (
    quota_reservation_id,
    generation,
    provider_attempt,
    created_at
  ) values (
    p_reservation_id,
    p_generation,
    p_provider_attempt,
    v_now
  );

  return jsonb_build_object(
    'allowed', true,
    'globalUsed', v_global_used + 1,
    'resetsAt', v_day_start + interval '1 day'
  );
end;
$$;

create or replace function public.finalize_ai_quota_service(
  p_reservation_id uuid,
  p_generation integer,
  p_outcome text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_outcome not in ('consumed', 'released') then
    raise exception using errcode = '22023', message = 'invalid quota outcome';
  end if;

  update public.ai_quota_reservations
  set status = p_outcome,
      finalized_at = clock_timestamp()
  where id = p_reservation_id
    and generation = p_generation
    and status = 'reserved';
end;
$$;

revoke all on function public.reserve_ai_quota_service(uuid, text, text, integer)
from public, anon, authenticated;
revoke all on function public.reserve_ai_provider_call_service(uuid, integer, integer, integer)
from public, anon, authenticated;
revoke all on function public.finalize_ai_quota_service(uuid, integer, text)
from public, anon, authenticated;

grant execute on function public.reserve_ai_quota_service(uuid, text, text, integer)
to service_role;
grant execute on function public.reserve_ai_provider_call_service(uuid, integer, integer, integer)
to service_role;
grant execute on function public.finalize_ai_quota_service(uuid, integer, text)
to service_role;
