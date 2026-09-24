-- Preserve all existing selections and rows; add the nine requested territories.
-- SABA and BONAIRE are explicit internal codes, avoiding a shared BQ choice.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.island_wishlist
  drop constraint island_wishlist_island_code_check,
  add constraint island_wishlist_island_code_check
    check (island_code in (
      'KN', 'LC', 'VC', 'GD', 'BB', 'SX', 'JM',
      'BM', 'MS', 'TC', 'VG', 'SABA', 'BONAIRE', 'BS', 'KY', 'CW', 'OTHER'
    ));
commit;
