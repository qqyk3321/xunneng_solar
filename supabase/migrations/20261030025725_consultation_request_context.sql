-- Candidate: private request context, atomic with first successful create/update.
-- The public customer preview view intentionally remains unchanged.
begin;
create table public.consultation_submission_context (
  consultation_id uuid primary key references public.consultations(id) on delete cascade,
  environment jsonb not null default '{}' check(jsonb_typeof(environment)='object' and octet_length(environment::text)<=8192),
  location jsonb not null default '{"status":"not_requested"}' check(jsonb_typeof(location)='object' and octet_length(location::text)<=1024),
  notice_version text not null,
  recorded_at timestamptz not null default now()
);
alter table public.consultation_submission_context enable row level security;
revoke all on public.consultation_submission_context from public,anon,authenticated;
grant select,insert,delete on public.consultation_submission_context to service_role;
alter table public.consultation_changes add column environment jsonb not null default '{}'
  check(jsonb_typeof(environment)='object' and octet_length(environment::text)<=8192 and not environment ? 'location' and not environment ? 'latitude' and not environment ? 'longitude');
-- Defaults preserve callers using the previous signatures without ambiguous overloads.
drop function public.submit_native_consultation(uuid,text,uuid,jsonb,text);
drop function public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb);
create function public.submit_native_consultation(p_request_id uuid,p_digest text,p_id uuid,p_input jsonb,p_token_hash text,p_context jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.consultations;
begin
  -- Transaction-scoped lock serializes simultaneous retries across all app instances.
  perform pg_advisory_xact_lock(hashtextextended('consultation:'||p_request_id::text,0));
  select * into saved from public.consultations where request_id=p_request_id;
  if found then
    if saved.request_digest<>p_digest then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  else
    if p_input->>'privacyAccepted'<>'true' or p_input->>'privacyVersion' not in ('2026-10-29-native-v1','2026-10-30-native-v2') or (p_input->>'schemaVersion')::integer<>1 then
      raise exception 'invalid_consultation';
    end if;
    insert into public.consultations(id,submission_id,request_id,request_digest,country_code,name,email,phone,phone_country,address,monthly_kwh,consumption_profile,answers,privacy_version,consent_at)
    values(p_id,'ST-'||upper(replace(p_id::text,'-','')),p_request_id,p_digest,p_input->>'country',p_input->>'name',p_input->>'email',p_input->>'phone',p_input->>'phoneCountry',jsonb_build_object('full',p_input->>'address'),(p_input->>'monthlyKwh')::numeric,p_input->>'profile',p_input->'answers',p_input->>'privacyVersion',now()) returning * into saved;
    insert into public.consultation_submission_context(consultation_id,environment,location,notice_version)
      values(saved.id,coalesce(p_context->'environment','{}'::jsonb),coalesce(p_context->'location','{"status":"not_requested"}'::jsonb),p_input->>'privacyVersion');
    insert into public.consultation_access_tokens(token_hash,consultation_id) values(p_token_hash,saved.id);
    insert into public.consultation_notifications(consultation_id,kind,request_id) values(saved.id,'automatic',p_request_id);
  end if;
  return jsonb_build_object('id',saved.id,'submission_id',saved.submission_id,'country_code',saved.country_code,'submitted_at',saved.submitted_at);
end $$;
revoke all on function public.submit_native_consultation(uuid,text,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_native_consultation(uuid,text,uuid,jsonb,text,jsonb) to service_role;

create function public.update_native_consultation(p_id uuid,p_token_hash text,p_request_id uuid,p_digest text,p_revision integer,p_section text,p_input jsonb,p_environment jsonb default '{}')
returns integer language plpgsql security invoker set search_path='' as $$
declare saved public.consultations; previous public.consultation_changes; before_data jsonb; after_data jsonb;
begin
  select * into saved from public.consultations where id=p_id for update;
  if not found or not exists(select 1 from public.consultation_management_grants where consultation_id=p_id and token_hash=p_token_hash and expires_at>now()) then
    raise sqlstate 'PT403' using message='management_required';
  end if;
  select * into previous from public.consultation_changes where consultation_id=p_id and request_id=p_request_id;
  if found then
    if previous.request_digest<>p_digest then raise sqlstate 'PT409' using message='request_conflict'; end if;
    return previous.revision;
  end if;
  if saved.revision<>p_revision then raise sqlstate 'PT409' using message='revision_conflict'; end if;
  if p_section='contact' then
    before_data=jsonb_build_object('name',saved.name,'email',saved.email,'phone',saved.phone,'phoneCountry',saved.phone_country);
    after_data=jsonb_build_object('name',p_input->>'name','email',p_input->>'email','phone',p_input->>'phone','phoneCountry',p_input->>'phoneCountry');
    update public.consultations set name=p_input->>'name',email=p_input->>'email',phone=p_input->>'phone',phone_country=p_input->>'phoneCountry' where id=p_id;
    -- Previously issued recovery emails must not regain access after an address change.
    if lower(btrim(saved.email))<>lower(btrim(p_input->>'email')) then
      update public.consultation_recovery_requests set expires_at=now() where email_key=saved.email_key and country_code=saved.country_code;
    end if;
  elsif p_section='electricity' then
    before_data=jsonb_build_object('monthlyKwh',saved.monthly_kwh,'profile',saved.consumption_profile);
    after_data=jsonb_build_object('monthlyKwh',(p_input->>'monthlyKwh')::numeric,'profile',p_input->>'profile');
    update public.consultations set monthly_kwh=(p_input->>'monthlyKwh')::numeric,consumption_profile=p_input->>'profile' where id=p_id;
  elsif p_section='property' then
    before_data=jsonb_build_object('address',saved.address->>'full','answers',saved.answers);
    after_data=jsonb_build_object('address',p_input->>'address','answers',p_input->'answers');
    update public.consultations set address=jsonb_build_object('full',p_input->>'address'),answers=p_input->'answers' where id=p_id;
  else raise exception 'invalid_section'; end if;
  update public.consultations set revision=revision+1,updated_at=now() where id=p_id;
  insert into public.consultation_changes(consultation_id,request_id,request_digest,revision,section,before_values,after_values,environment)
    values(p_id,p_request_id,p_digest,saved.revision+1,p_section,before_data,after_data,coalesce(p_environment,'{}'::jsonb));
  return saved.revision+1;
end $$;
revoke all on function public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb) to service_role;

commit;
