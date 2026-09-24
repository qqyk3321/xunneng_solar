-- Expand only the accepted wishlist locations; preserve rows, uniqueness and RLS.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.island_wishlist
  drop constraint island_wishlist_island_code_check,
  add constraint island_wishlist_island_code_check
    check (island_code in ('KN', 'LC', 'VC', 'GD', 'BB', 'SX', 'JM', 'OTHER'));
commit;
