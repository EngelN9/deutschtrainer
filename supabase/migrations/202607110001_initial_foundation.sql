create type public.cefr_level as enum ('B1', 'B2', 'C1', 'C2');
create type public.app_role as enum ('learner', 'content_editor', 'reviewer', 'admin');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'learner',
  timezone text not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  daily_minutes integer not null default 20 check (daily_minutes between 5 and 240),
  target_level public.cefr_level not null default 'B2',
  notifications_enabled boolean not null default true,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  audio_settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create table public.user_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  current_level public.cefr_level not null default 'B1',
  target_level public.cefr_level not null default 'B2',
  placement_status text not null default 'not_started'
    check (placement_status in ('not_started', 'in_progress', 'completed')),
  placement_result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_levels_current_level_idx on public.user_levels(current_level);

create trigger user_levels_set_updated_at
before update on public.user_levels
for each row execute function public.set_updated_at();

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null default '',
  enabled boolean not null default false,
  audience_json jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
before update on public.feature_flags
for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_created_at_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() and deleted_at is null
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() and deleted_at is null
$$;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_levels enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self read"
on public.profiles for select
to authenticated
using (auth_user_id = auth.uid() or public.current_app_role() = 'admin');

create policy "profiles self update"
on public.profiles for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "admin manages profiles"
on public.profiles for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "preferences owner access"
on public.user_preferences for all
to authenticated
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

create policy "levels owner access"
on public.user_levels for all
to authenticated
using (user_id = public.current_profile_id())
with check (user_id = public.current_profile_id());

create policy "feature flags admin read write"
on public.feature_flags for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "audit logs admin read"
on public.audit_logs for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "audit logs admin insert"
on public.audit_logs for insert
to authenticated
with check (public.current_app_role() = 'admin');
