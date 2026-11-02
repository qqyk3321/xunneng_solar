begin;
set local role service_role;
do $$
declare request_id bigint; count_before bigint;
begin
  select count(*) into count_before from public.wishlist_confirmation_emails;
  insert into public.island_wishlist(email,island_code,other_island)
  values ('wishlist-rollback-test@example.invalid','OTHER','rollback test') returning id into request_id;
  if (select count(*) from public.wishlist_confirmation_emails where wishlist_id=request_id and status='pending' and recipient_email='wishlist-rollback-test@example.invalid') <> 1 then raise exception 'audit missing'; end if;
  insert into public.island_wishlist(email,island_code,other_island)
  values ('wishlist-rollback-test@example.invalid','OTHER','rollback test') on conflict(email,island_code,other_island) do nothing;
  if (select count(*) from public.wishlist_confirmation_emails) <> count_before+1 then raise exception 'duplicate audit'; end if;
  if not (select relrowsecurity from pg_class where oid='public.wishlist_confirmation_emails'::regclass) then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon','public.wishlist_confirmation_emails','select') or has_table_privilege('authenticated','public.wishlist_confirmation_emails','select') then raise exception 'public read'; end if;
  if has_table_privilege('anon','public.wishlist_confirmation_emails','insert') or has_table_privilege('authenticated','public.wishlist_confirmation_emails','update') then raise exception 'public write'; end if;
  delete from public.island_wishlist where id=request_id;
  if exists(select 1 from public.wishlist_confirmation_emails where wishlist_id=request_id) then raise exception 'orphan audit'; end if;
end $$;
rollback;
select 'wishlist constraints, trigger, duplicate and RLS checks passed; test rows rolled back' as result;
