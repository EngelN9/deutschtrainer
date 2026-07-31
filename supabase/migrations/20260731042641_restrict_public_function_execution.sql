-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Keep direct
-- RPC access explicit: authenticated clients may call only the identity helpers
-- and role-checked admin entry points that are part of the application contract.

revoke all on function public.set_updated_at()
from public, anon, authenticated;

revoke all on function public.prevent_profile_role_escalation()
from public, anon, authenticated;

revoke all on function public.handle_new_auth_user()
from public, anon, authenticated;

revoke all on function public.enforce_content_publish_review()
from public, anon, authenticated;

revoke all on function public.audit_content_publish()
from public, anon, authenticated;

revoke all on function public.current_profile_id()
from public, anon, authenticated;

revoke all on function public.current_app_role()
from public, anon, authenticated;

revoke all on function public.is_content_team()
from public, anon, authenticated;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_content_team() to authenticated;

revoke all on function public.admin_save_course(uuid, integer, jsonb, text)
from public, anon, authenticated;

revoke all on function public.admin_save_exercise(uuid, integer, jsonb, text)
from public, anon, authenticated;

revoke all on function public.admin_submit_content_review(text, uuid, integer, text)
from public, anon, authenticated;

revoke all on function public.admin_review_content(uuid, text, text)
from public, anon, authenticated;

revoke all on function public.admin_publish_content(text, uuid, integer)
from public, anon, authenticated;

grant execute on function public.admin_save_course(uuid, integer, jsonb, text)
to authenticated;

grant execute on function public.admin_save_exercise(uuid, integer, jsonb, text)
to authenticated;

grant execute on function public.admin_submit_content_review(text, uuid, integer, text)
to authenticated;

grant execute on function public.admin_review_content(uuid, text, text)
to authenticated;

grant execute on function public.admin_publish_content(text, uuid, integer)
to authenticated;
