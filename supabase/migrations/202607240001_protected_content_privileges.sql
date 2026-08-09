-- Keep server-only grading references and listening transcripts outside the
-- PostgREST data plane even when a hosted project grants new public-schema
-- tables to client roles by default. RLS remains enabled as a second boundary.
revoke all privileges on table
  public.writing_prompt_rules,
  public.listening_asset_content
from anon, authenticated;

grant select on table
  public.writing_prompt_rules,
  public.listening_asset_content
to service_role;
