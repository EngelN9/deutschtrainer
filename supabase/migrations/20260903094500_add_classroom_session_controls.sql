-- Classroom realtime sessions bill per minute against the server's own OpenAI key, so the
-- request-scoped AI quota machinery cannot express them: a reservation there expires after ten
-- minutes, which a fifteen-minute lesson outlives. This migration reuses that migration's *pattern*
-- (service-role only, security definer with a fixed search_path, advisory locks for atomicity)
-- rather than its functions.
--
-- The controls are: at most one live session per learner, a rolling 24h per-learner cap, a UTC-day
-- global cap, and a server-side expiry the sweeper enforces by hanging up the call at the provider.

create table public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  call_id text not null unique check (char_length(call_id) between 1 and 200),
  safety_identifier text not null check (char_length(safety_identifier) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'ended', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_reason text check (ended_reason is null or char_length(ended_reason) <= 100)
);

-- One live session per learner, enforced by the database rather than by application logic.
create unique index classroom_sessions_one_active_per_user
on public.classroom_sessions(user_id)
where status = 'active';

create index classroom_sessions_active_expiry_idx
on public.classroom_sessions(expires_at)
where status = 'active';

create index classroom_sessions_user_started_idx
on public.classroom_sessions(user_id, started_at desc);

alter table public.classroom_sessions enable row level security;

revoke all on table public.classroom_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.classroom_sessions to service_role;

-- Atomically admit a session. Every limit is checked under a lock in the same transaction that
-- inserts the row, so concurrent requests cannot both pass a count-then-act window.
create or replace function public.start_classroom_session_service(
  p_user_id uuid,
  p_call_id text,
  p_safety_identifier text,
  p_max_session_seconds integer,
  p_daily_limit integer,
  p_global_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_used integer;
  v_global_used integer;
  v_expires_at timestamptz;
  v_session public.classroom_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_max_session_seconds < 60 or p_max_session_seconds > 3600 then
    raise exception using errcode = '22023', message = 'invalid max session seconds';
  end if;
  if p_daily_limit < 1 or p_daily_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid daily session limit';
  end if;
  if p_global_daily_limit < 1 or p_global_daily_limit > 1000 then
    raise exception using errcode = '22023', message = 'invalid global daily session limit';
  end if;
  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'learner'
      and deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'classroom sessions require an active learner';
  end if;

  -- Global lock first, then the per-user lock, always in this order, so two sessions starting at
  -- once cannot deadlock against each other.
  perform pg_advisory_xact_lock(hashtextextended('classroom-session-global-day', 0));
  perform pg_advisory_xact_lock(hashtextextended('classroom-session:' || p_user_id::text, 0));

  -- Checks run most-specific first so the learner is told the reason they can act on. Reporting
  -- GLOBAL_LIMIT to someone who has simply used their own two sessions is both misleading and
  -- unactionable.
  if exists (
    select 1
    from public.classroom_sessions
    where user_id = p_user_id
      and status = 'active'
  ) then
    return jsonb_build_object('allowed', false, 'reason', 'ACTIVE_SESSION');
  end if;

  select count(*)::integer into v_used
  from public.classroom_sessions
  where user_id = p_user_id
    and started_at >= v_now - interval '24 hours';

  if v_used >= p_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT');
  end if;

  select count(*)::integer into v_global_used
  from public.classroom_sessions
  where started_at >= v_day_start;

  if v_global_used >= p_global_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'GLOBAL_LIMIT');
  end if;

  v_expires_at := v_now + make_interval(secs => p_max_session_seconds);

  insert into public.classroom_sessions (
    user_id, call_id, safety_identifier, status, started_at, expires_at
  )
  values (p_user_id, p_call_id, p_safety_identifier, 'active', v_now, v_expires_at)
  returning * into v_session;

  return jsonb_build_object(
    'allowed', true,
    'sessionId', v_session.id,
    'expiresAt', v_session.expires_at
  );
end;
$$;

-- Close a session. Idempotent: ending an already-closed session succeeds without changing it, so a
-- client retry and the sweeper racing on the same call cannot corrupt the record.
create or replace function public.end_classroom_session_service(
  p_call_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.classroom_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  select * into v_session
  from public.classroom_sessions
  where call_id = p_call_id
  for update;

  if not found then
    return jsonb_build_object('ended', false, 'reason', 'NOT_FOUND');
  end if;

  if v_session.status <> 'active' then
    return jsonb_build_object('ended', false, 'reason', 'ALREADY_CLOSED', 'userId', v_session.user_id);
  end if;

  update public.classroom_sessions
  set status = case when p_reason = 'expired' then 'expired' else 'ended' end,
      ended_at = clock_timestamp(),
      ended_reason = left(coalesce(p_reason, 'ended'), 100)
  where id = v_session.id;

  return jsonb_build_object('ended', true, 'userId', v_session.user_id);
end;
$$;

-- Sessions whose server-side budget has elapsed. The sweeper hangs each of these up at the
-- provider, then closes the row.
create or replace function public.list_expired_classroom_sessions_service()
returns table (call_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  return query
  select s.call_id
  from public.classroom_sessions s
  where s.status = 'active'
    and s.expires_at <= clock_timestamp()
  order by s.expires_at
  limit 100;
end;
$$;

revoke all on function public.start_classroom_session_service(uuid, text, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.end_classroom_session_service(text, text) from public, anon, authenticated;
revoke all on function public.list_expired_classroom_sessions_service() from public, anon, authenticated;
grant execute on function public.start_classroom_session_service(uuid, text, text, integer, integer, integer) to service_role;
grant execute on function public.end_classroom_session_service(text, text) to service_role;
grant execute on function public.list_expired_classroom_sessions_service() to service_role;
