-- Structured application writes are server-authoritative. Mobile and Admin may
-- read only the rows allowed by RLS; all public-schema mutations go through the
-- API service role or the reviewed role-checking RPC allowlist.
revoke insert, update, delete, truncate, references, trigger
on all tables in schema public
from anon, authenticated;

-- New public tables must not inherit legacy Data API mutation grants. Explicit
-- future client writes require a dedicated migration, RLS policy and test.
alter default privileges in schema public
revoke insert, update, delete, truncate, references, trigger
on tables
from anon, authenticated;

do $migration_check$
declare
  public_table record;
begin
  for public_table in
    select relation.oid, relation.relname
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
  loop
    if has_table_privilege('anon', public_table.oid, 'INSERT')
      or has_table_privilege('anon', public_table.oid, 'UPDATE')
      or has_table_privilege('anon', public_table.oid, 'DELETE')
      or has_table_privilege('anon', public_table.oid, 'TRUNCATE')
      or has_table_privilege('anon', public_table.oid, 'REFERENCES')
      or has_table_privilege('anon', public_table.oid, 'TRIGGER')
      or has_table_privilege('authenticated', public_table.oid, 'INSERT')
      or has_table_privilege('authenticated', public_table.oid, 'UPDATE')
      or has_table_privilege('authenticated', public_table.oid, 'DELETE')
      or has_table_privilege('authenticated', public_table.oid, 'TRUNCATE')
      or has_table_privilege('authenticated', public_table.oid, 'REFERENCES')
      or has_table_privilege('authenticated', public_table.oid, 'TRIGGER')
    then
      raise exception
        'client mutation privilege remains on public.%', public_table.relname;
    end if;
  end loop;
end;
$migration_check$;
