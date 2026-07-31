alter table public.content_reviews
drop constraint content_reviews_requested_by_fkey;

alter table public.content_reviews
alter column requested_by drop not null;

alter table public.content_reviews
add constraint content_reviews_requested_by_fkey
foreign key (requested_by) references public.profiles(id) on delete set null;

drop policy if exists "learners upload own speaking audio" on storage.objects;
create policy "active learners upload own speaking audio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and deleted_at is null
  )
);

drop policy if exists "learners read own speaking audio" on storage.objects;
create policy "active learners read own speaking audio"
on storage.objects for select to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and deleted_at is null
  )
);

drop policy if exists "learners delete own speaking audio" on storage.objects;
create policy "active learners delete own speaking audio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and deleted_at is null
  )
);

create or replace function public.begin_account_deletion_service(p_auth_user_id uuid)
returns table (
  profile_id uuid,
  storage_bucket text,
  storage_path text
)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_profile_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

  select id
  into v_profile_id
  from public.profiles
  where auth_user_id = p_auth_user_id
  for update;

  if v_profile_id is null then
    raise exception 'profile was not found' using errcode = '22023';
  end if;

  update public.profiles
  set deleted_at = coalesce(deleted_at, now())
  where id = v_profile_id;

  return query
  select
    v_profile_id,
    audio_assets.storage_bucket,
    audio_assets.storage_path
  from public.audio_assets
  where audio_assets.owner_user_id = v_profile_id
  order by audio_assets.storage_bucket, audio_assets.storage_path;
end;
$$;

revoke all on function public.begin_account_deletion_service(uuid)
from public, anon, authenticated;

grant execute on function public.begin_account_deletion_service(uuid)
to service_role;

comment on function public.begin_account_deletion_service(uuid) is
'Service-only, replay-safe account deletion boundary. It blocks active profile access and returns owner-scoped Storage objects for API deletion before the Auth user is removed.';
