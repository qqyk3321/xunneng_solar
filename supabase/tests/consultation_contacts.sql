begin;
do $$
begin
  assert (select submission_count = 2 and latest_submitted_at = '2026-10-02Z'::timestamptz from public.consultation_contacts where email='backfill@example.test'), 'backfill normalizes email, ignores names';
  assert (select count(*)=2 from public.consultation_contacts), 'backfill groups';
  assert (select relrowsecurity from pg_class where oid='public.consultation_contacts'::regclass), 'RLS enabled';
  assert has_table_privilege('service_role','public.consultation_contacts','SELECT'), 'server reads';
  assert not has_table_privilege('service_role','public.consultation_contacts','INSERT,UPDATE,DELETE'), 'summary cannot be edited directly';
  assert not has_table_privilege('anon','public.consultation_contacts','SELECT'), 'anonymous reads denied';
  assert not has_table_privilege('authenticated','public.consultation_contacts','SELECT'), 'direct browser reads denied';
  assert not has_function_privilege('service_role','consultation_contacts_private.sync_history()','EXECUTE'), 'trigger cannot be called by API';
end $$;
set local role service_role;
insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload)
values ('contacts-test','newest','2026-10-05Z','AG','One name',' Mixed@Example.Test ','12345678','{"full_address":"test"}','{}'),
       ('contacts-test','old-late','2026-09-01Z','AG','A totally different name','mixed@example.test','87654321','{"full_address":"test"}','{}');
insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload)
values ('contacts-test','newest','2026-10-10Z','AG','duplicate','mixed@example.test','12345678','{"full_address":"test"}','{}') on conflict (form_id,submission_id) do nothing;
reset role;
do $$
begin
  assert (select submission_count=2 and latest_submitted_at='2026-10-05Z'::timestamptz from public.consultation_contacts where email='mixed@example.test'), 'late/duplicate do not distort summary';
  begin
    insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload)
    values ('contacts-test','newest','2026-10-10Z','AG','duplicate','mixed@example.test','12345678','{"full_address":"test"}','{}');
    raise exception 'duplicate accepted';
  exception when unique_violation then null;
  end;
  assert (select submission_count=2 from public.consultation_contacts where email='mixed@example.test'), 'failed duplicate rolls back';
end $$;
update public.tally_form_submissions set name='Another name',email='MIXED@example.test' where submission_id='newest' and form_id='contacts-test';
update public.tally_form_submissions set submitted_at='2026-08-01Z' where submission_id='newest' and form_id='contacts-test';
do $$ begin
 assert (select submission_count=2 and latest_submitted_at='2026-09-01Z'::timestamptz from public.consultation_contacts where email='mixed@example.test'), 'corrected time repairs latest';
end $$;
update public.tally_form_submissions set email='mixed+separate@example.test' where submission_id='old-late' and form_id='contacts-test';
do $$ begin
 assert (select submission_count=1 and latest_submitted_at='2026-08-01Z'::timestamptz from public.consultation_contacts where email='mixed@example.test'), 'email move repairs old group';
 assert (select submission_count=1 from public.consultation_contacts where email='mixed+separate@example.test'), 'plus address is distinct';
end $$;
delete from public.tally_form_submissions where submission_id='newest' and form_id='contacts-test';
do $$ begin assert not exists(select 1 from public.consultation_contacts where email='mixed@example.test'), 'last deletion removes group';end $$;
delete from public.tally_form_submissions where submission_id='backfill-2';
do $$ begin
 assert (select submission_count=1 and latest_submitted_at='2026-10-01Z'::timestamptz from public.consultation_contacts where email='backfill@example.test'), 'deletion repairs count and time';
end $$;
-- Row triggers run after all rows in a statement have changed. Whole-group
-- moves and deletions must not produce a NULL latest timestamp mid-statement.
insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload)
values ('contacts-test','bulk-1','2026-10-05Z','AG','One','bulk@example.test','12345678','{"full_address":"test"}','{}'),
       ('contacts-test','bulk-2','2026-10-06Z','AG','Two','bulk@example.test','12345678','{"full_address":"test"}','{}');
update public.tally_form_submissions set email='bulk-moved@example.test' where email_key='bulk@example.test';
do $$ begin
 assert not exists(select 1 from public.consultation_contacts where email='bulk@example.test'), 'bulk email move removes old group';
 assert (select submission_count=2 and latest_submitted_at='2026-10-06Z'::timestamptz from public.consultation_contacts where email='bulk-moved@example.test'), 'bulk email move preserves count and time';
end $$;
delete from public.tally_form_submissions where email_key='bulk-moved@example.test';
do $$ begin assert not exists(select 1 from public.consultation_contacts where email='bulk-moved@example.test'), 'bulk deletion removes whole group';end $$;
truncate public.tally_form_submissions cascade;
do $$ begin assert not exists(select 1 from public.consultation_contacts), 'truncate repairs summary';end $$;
rollback;
select 'PASS: backfill, insert, normalization, duplicate, late arrival, rename, correction, deletion and permissions' as result;
