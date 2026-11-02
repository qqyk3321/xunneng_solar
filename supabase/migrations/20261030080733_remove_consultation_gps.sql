-- Retire device location collection. Existing request IDs/digests stay unchanged.
-- Deploy the staff reader without location first; this removes stored GPS data.
begin;
create or replace function public.submit_native_consultation(p_request_id uuid,p_digest text,p_id uuid,p_input jsonb,p_token_hash text,p_context jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.consultations;
begin
  -- Transaction-scoped lock serializes simultaneous retries across all app instances.
  perform pg_advisory_xact_lock(hashtextextended('consultation:'||p_request_id::text,0));
  select * into saved from public.consultations where request_id=p_request_id;
  if found then
    if saved.request_digest<>p_digest then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  else
    if p_input->>'privacyAccepted'<>'true' or p_input->>'privacyVersion' not in ('2026-10-29-native-v1','2026-10-30-native-v2','2026-10-30-native-v3') or (p_input->>'schemaVersion')::integer<>1 then
      raise exception 'invalid_consultation';
    end if;
    insert into public.consultations(id,submission_id,request_id,request_digest,country_code,name,email,phone,phone_country,address,monthly_kwh,consumption_profile,answers,privacy_version,consent_at)
    values(p_id,'ST-'||upper(replace(p_id::text,'-','')),p_request_id,p_digest,p_input->>'country',p_input->>'name',p_input->>'email',p_input->>'phone',p_input->>'phoneCountry',jsonb_build_object('full',p_input->>'address'),(p_input->>'monthlyKwh')::numeric,p_input->>'profile',p_input->'answers',p_input->>'privacyVersion',now()) returning * into saved;
    insert into public.consultation_submission_context(consultation_id,environment,notice_version)
      values(saved.id,coalesce(p_context->'environment','{}'::jsonb),p_input->>'privacyVersion');
    insert into public.consultation_access_tokens(token_hash,consultation_id) values(p_token_hash,saved.id);
    insert into public.consultation_notifications(consultation_id,kind,request_id) values(saved.id,'automatic',p_request_id);
  end if;
  return jsonb_build_object('id',saved.id,'submission_id',saved.submission_id,'country_code',saved.country_code,'submitted_at',saved.submitted_at);
end $$;
revoke all on function public.submit_native_consultation(uuid,text,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_native_consultation(uuid,text,uuid,jsonb,text,jsonb) to service_role;

alter table public.consultation_submission_context drop column location;
alter table public.consultation_submission_context add constraint consultation_context_no_coordinates check (not environment ?| array['location','latitude','longitude','accuracy','capturedAt']);
notify pgrst, 'reload schema';
commit;
