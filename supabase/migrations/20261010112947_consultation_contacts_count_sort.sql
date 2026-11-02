begin;
set local lock_timeout = '5s';

-- The directory sorts stored counts before pagination; reverse scans serve
-- ascending count/descending ID without recalculating submission history.
create index consultation_contacts_count_idx
  on public.consultation_contacts (submission_count desc, id);

commit;
