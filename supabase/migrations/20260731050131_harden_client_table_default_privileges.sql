-- PostgreSQL 17 adds MAINTAIN to table privileges. Keep it outside client roles
-- on existing tables as well as tables created by repository migrations.
revoke maintain
on all tables in schema public
from anon, authenticated;

alter default privileges for role postgres in schema public
revoke insert, update, delete, truncate, references, trigger, maintain
on tables
from anon, authenticated;

do $migration_check$
declare
  remaining_current_privileges integer;
  remaining_default_privileges integer;
begin
  select count(*)
  into remaining_current_privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in (
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER',
      'MAINTAIN'
    );

  if remaining_current_privileges > 0 then
    raise exception
      'client mutation or maintenance privileges remain on public tables';
  end if;

  select count(*)
  into remaining_default_privileges
  from pg_default_acl as defaults
  join pg_roles as owner_role
    on owner_role.oid = defaults.defaclrole
  cross join lateral aclexplode(defaults.defaclacl) as expanded
  left join pg_roles as grantee_role
    on grantee_role.oid = expanded.grantee
  where defaults.defaclnamespace = 'public'::regnamespace
    and defaults.defaclobjtype = 'r'
    and owner_role.rolname = 'postgres'
    and coalesce(grantee_role.rolname, 'PUBLIC') in ('anon', 'authenticated')
    and expanded.privilege_type in (
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER',
      'MAINTAIN'
    );

  if remaining_default_privileges > 0 then
    raise exception
      'client mutation or maintenance privileges remain in public table defaults';
  end if;
end;
$migration_check$;
