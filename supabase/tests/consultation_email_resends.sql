-- Run inside a transaction and ROLLBACK. No network calls or customer changes.
set local role service_role;
do $$
declare
  submission bigint;
  req1 uuid := '10000000-0000-4000-8000-000000000001';
  req2 uuid := '10000000-0000-4000-8000-000000000002';
  actor uuid := '20000000-0000-4000-8000-000000000001';
  result jsonb;
begin
  select id into submission from public.tally_form_submissions order by id limit 1;
  if submission is null then raise exception 'Test needs one stored submission'; end if;
  result := public.claim_consultation_email_resend(req1, submission, actor, 'test@example.test', '{"original":true}');
  if result->>'status' <> 'send' then raise exception 'First request must be claimed'; end if;
  result := public.claim_consultation_email_resend(req1, submission, actor, 'test@example.test', '{"changed":true}');
  if result->>'status' <> 'pending' then raise exception 'Double click must wait'; end if;
  result := public.claim_consultation_email_resend(req2, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'pending' or result->>'request_id' <> req1::text then raise exception 'Another tab must reuse the pending operation'; end if;
  update public.consultation_email_resends set last_attempt_at = now() - interval '16 seconds' where request_id = req1;
  result := public.claim_consultation_email_resend(req2, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'send' or result->'payload' <> '{"original":true}'::jsonb then raise exception 'Retry must use the exact original payload'; end if;
  update public.consultation_email_resends set status = 'accepted' where request_id = req1;
  result := public.claim_consultation_email_resend(req1, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'accepted' then raise exception 'Completed replay must not resend'; end if;
  result := public.claim_consultation_email_resend(req2, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'cooldown' then raise exception 'New send must obey cooldown'; end if;
  update public.consultation_email_resends set last_attempt_at = now() - interval '61 seconds' where request_id = req1;
  result := public.claim_consultation_email_resend(req2, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'send' or result->>'request_id' <> req2::text then raise exception 'Explicit later resend must get its own key'; end if;
  update public.consultation_email_resends set requested_at = now() - interval '24 hours', last_attempt_at = now() - interval '61 seconds' where request_id = req2;
  result := public.claim_consultation_email_resend(req2, submission, actor, 'test@example.test', '{}');
  if result->>'status' <> 'uncertain' then raise exception 'Never replay beyond provider retention'; end if;
  if has_table_privilege('anon','public.consultation_email_resends','SELECT') or has_table_privilege('authenticated','public.consultation_email_resends','SELECT')
    or has_function_privilege('authenticated','public.claim_consultation_email_resend(uuid,bigint,uuid,text,jsonb)','EXECUTE') then raise exception 'Private delivery records must not be publicly accessible'; end if;
end;
$$;
reset role;
select 'claim/retry/cooldown/access checks passed' as result;
