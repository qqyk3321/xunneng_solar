-- Candidate only. Browser management grants are separate from shareable preview tokens.
begin;
alter table public.consultations add column revision integer not null default 1,
  add column updated_at timestamptz not null default now();
create table public.consultation_management_grants (
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default now()+interval '90 days',
  primary key(consultation_id,token_hash)
);
create index consultation_management_device on public.consultation_management_grants(token_hash,expires_at);
create table public.consultation_changes (
  consultation_id uuid not null references public.consultations(id),
  request_id uuid not null, request_digest text not null,
  revision integer not null, section text not null check(section in ('contact','electricity','property')),
  before_values jsonb not null, after_values jsonb not null,
  changed_at timestamptz not null default now(),
  primary key(consultation_id,request_id), unique(consultation_id,revision)
);
create table public.consultation_recovery_requests (
  request_id uuid primary key, token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  email_key text not null, country_code text not null check(country_code in ('AG','DM')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '20 minutes',
  consumed_by text, consumed_at timestamptz
);
create index consultation_recovery_email on public.consultation_recovery_requests(email_key,created_at desc);
alter table public.consultation_management_grants enable row level security;
alter table public.consultation_changes enable row level security;
alter table public.consultation_recovery_requests enable row level security;
revoke all on public.consultation_management_grants,public.consultation_changes,public.consultation_recovery_requests from public,anon,authenticated;
grant all on public.consultation_management_grants,public.consultation_changes,public.consultation_recovery_requests to service_role;

create function public.update_native_consultation(p_id uuid,p_token_hash text,p_request_id uuid,p_digest text,p_revision integer,p_section text,p_input jsonb)
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
  insert into public.consultation_changes(consultation_id,request_id,request_digest,revision,section,before_values,after_values)
    values(p_id,p_request_id,p_digest,saved.revision+1,p_section,before_data,after_data);
  return saved.revision+1;
end $$;
revoke all on function public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb) to service_role;

create function public.request_consultation_recovery(p_request_id uuid,p_token_hash text,p_email text,p_country text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare previous public.consultation_recovery_requests;
begin
  perform pg_advisory_xact_lock(hashtextextended('consultation-recovery:'||p_email,0));
  select * into previous from public.consultation_recovery_requests where request_id=p_request_id;
  if found then return previous.email_key=p_email and previous.country_code=p_country and previous.token_hash=p_token_hash and previous.expires_at>now() and previous.consumed_at is null; end if;
  if not exists(select 1 from public.consultations where email_key=p_email and country_code=p_country)
    or exists(select 1 from public.consultation_recovery_requests where email_key=p_email and created_at>now()-interval '1 minute')
    or (select count(*) from public.consultation_recovery_requests where email_key=p_email and created_at>now()-interval '1 hour')>=3 then return false; end if;
  insert into public.consultation_recovery_requests(request_id,token_hash,email_key,country_code) values(p_request_id,p_token_hash,p_email,p_country);
  return true;
end $$;
revoke all on function public.request_consultation_recovery(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.request_consultation_recovery(uuid,text,text,text) to service_role;

create function public.redeem_consultation_recovery(p_token_hash text,p_device_hash text,p_country text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare recovery public.consultation_recovery_requests;
begin
  select * into recovery from public.consultation_recovery_requests where token_hash=p_token_hash and country_code=p_country for update;
  if not found or recovery.expires_at<=now() or (recovery.consumed_by is not null and recovery.consumed_by<>p_device_hash) then
    raise sqlstate 'PT410' using message='recovery_expired';
  end if;
  if recovery.consumed_by is not null then return true; end if;
  insert into public.consultation_management_grants(consultation_id,token_hash)
    select id,p_device_hash from public.consultations where email_key=recovery.email_key and country_code=recovery.country_code
    on conflict(consultation_id,token_hash) do update set expires_at=excluded.expires_at;
  update public.consultation_recovery_requests set consumed_by=p_device_hash,consumed_at=now() where request_id=recovery.request_id;
  return true;
end $$;
revoke all on function public.redeem_consultation_recovery(text,text,text) from public,anon,authenticated;
grant execute on function public.redeem_consultation_recovery(text,text,text) to service_role;

create or replace view public.consultation_records with(security_invoker=true) as
 select c.id::text id,c.id consultation_id,'native'::text source,c.submission_id,c.country_code,
 case c.country_code when 'AG' then 'Antigua and Barbuda' else 'Dominica' end country_name,
 c.name,c.email,c.email_key,c.phone,c.phone_country,c.address,c.monthly_kwh,c.consumption_profile,c.answers,c.schema_version,c.submitted_at,c.received_at,
 null::jsonb payload,null::text form_id,c.revision,c.updated_at from public.consultations c;
commit;
