-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- Keep every PostgREST role closed unless a migration grants the exact function
-- signature to an intended role.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public
revoke execute on functions from public;

-- Trigger functions are never client RPCs. PostgreSQL invokes them through their
-- registered triggers, so authenticated clients do not need direct EXECUTE.
revoke execute on function public.set_updated_at() from authenticated;
revoke execute on function public.prevent_profile_role_escalation() from authenticated;
revoke execute on function public.handle_new_auth_user() from authenticated;
revoke execute on function public.enforce_content_publish_review() from authenticated;
revoke execute on function public.audit_content_publish() from authenticated;

-- The database linter requires every function to have an immutable search path.
-- This trigger only uses NEW and pg_catalog.now(), so an empty path is sufficient.
alter function public.set_updated_at()
set search_path = '';

-- Fail the migration if a future edit accidentally leaves the current
-- privileged surface broader than the reviewed allowlist.
do $migration_check$
begin
  if exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ) then
    raise exception 'anon must not execute public SECURITY DEFINER functions';
  end if;

  if exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      and procedure.proname not in (
        'admin_publish_content',
        'admin_review_content',
        'admin_save_course',
        'admin_save_exercise',
        'admin_submit_content_review',
        'current_app_role',
        'current_profile_id',
        'is_content_team'
      )
  ) then
    raise exception
      'authenticated SECURITY DEFINER access exceeds the reviewed allowlist';
  end if;
end;
$migration_check$;
