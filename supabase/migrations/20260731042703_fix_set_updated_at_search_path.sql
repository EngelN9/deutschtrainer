-- The trigger function only relies on PostgreSQL built-ins. Pin its lookup
-- path so caller-controlled schemas cannot shadow referenced functions.
alter function public.set_updated_at()
set search_path = pg_catalog;
