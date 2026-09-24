-- Verify real constraints without persisting any customer or test records.
begin;
create temporary table wishlist_location_probe (like public.island_wishlist including constraints) on commit drop;
insert into wishlist_location_probe
  (id, created_at, email, island_code, other_island, status, source, consent_version)
select row_number() over (), now(), 'migration-probe@example.com', code, '', 'pending', 'test', 'launch-email-v1'
from unnest(array['KN','LC','VC','GD','BB','SX','JM']) code;
do $$
begin
  begin
    insert into wishlist_location_probe
      (id, created_at, email, island_code, other_island, status, source, consent_version)
    values (99, now(), 'migration-probe@example.com', 'INVALID', '', 'pending', 'test', 'launch-email-v1');
    raise exception 'Invalid country was incorrectly accepted';
  exception when check_violation then null;
  end;
end $$;
select count(*) as accepted_locations,
  (select relrowsecurity from pg_class where oid = 'public.island_wishlist'::regclass) as rls_enabled,
  has_table_privilege('anon', 'public.island_wishlist', 'INSERT') as anonymous_direct_insert,
  has_table_privilege('authenticated', 'public.island_wishlist', 'INSERT') as authenticated_direct_insert
from wishlist_location_probe;
rollback;
