-- Additive candidate migration. Apply only to an isolated database until cutover.
begin;
create table public.consultations (
  id uuid primary key,
  submission_id text not null unique,
  request_id uuid unique,
  request_digest text check (request_digest ~ '^[0-9a-f]{64}$'),
  schema_version integer not null default 1,
  country_code text not null check (country_code in ('AG','DM')),
  name text not null, email text not null,
  email_key text generated always as (lower(btrim(email))) stored,
  phone text not null, phone_country text,
  address jsonb not null, monthly_kwh numeric,
  consumption_profile text check (consumption_profile in ('daytime','rush','evening','night')),
  answers jsonb not null default '{}',
  privacy_version text, consent_at timestamptz,
  submitted_at timestamptz not null default now(), received_at timestamptz not null default now(),
  check (request_id is not null and request_digest is not null and consent_at is not null and monthly_kwh is not null and monthly_kwh > 0 and monthly_kwh <= 1000000)
);
create index consultations_submitted_idx on public.consultations (submitted_at desc, id desc);
create index consultations_country_idx on public.consultations (country_code, submitted_at desc, id desc);
create index consultations_email_idx on public.consultations (email_key, submitted_at desc, id desc);
create table public.consultation_access_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index consultation_access_tokens_owner_idx on public.consultation_access_tokens(consultation_id);
create table public.consultation_notifications (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete restrict,
  kind text not null check (kind in ('automatic','manual')),
  request_id uuid not null unique,
  actor_id uuid, actor_email text,
  status text not null default 'pending' check(status in ('pending','accepted','failed')),
  attempts integer not null default 0,
  first_attempt_at timestamptz, next_attempt_at timestamptz not null default now(),
  lease_until timestamptz, lease_token uuid,
  provider_id text, provider_status integer, last_error text, delivery_payload jsonb,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create unique index consultation_one_confirmation on public.consultation_notifications(consultation_id) where kind='automatic';
create index consultation_notification_due on public.consultation_notifications(next_attempt_at,created_at) where status='pending';
create index consultation_notification_owner on public.consultation_notifications(consultation_id,created_at desc);
create table public.consultation_notification_attempts (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.consultation_notifications(id),
  attempt integer not null, outcome text not null,
  provider_status integer, attempted_at timestamptz not null default now()
);
create index consultation_attempt_owner on public.consultation_notification_attempts(notification_id);
create table public.consultation_attachments (
  id uuid primary key default gen_random_uuid(), consultation_id uuid not null references public.consultations(id),
  provider text not null, bucket text not null, object_key text not null,
  filename text not null, mime_type text not null, bytes bigint not null check(bytes>0),
  sha256 text, created_at timestamptz not null default now(), unique(provider,bucket,object_key)
);
create index consultation_attachment_owner on public.consultation_attachments(consultation_id);
-- Default PUBLIC function privileges must not expose the write-only RPCs.
alter table public.consultations enable row level security;
alter table public.consultation_access_tokens enable row level security;
alter table public.consultation_notifications enable row level security;
alter table public.consultation_notification_attempts enable row level security;
alter table public.consultation_attachments enable row level security;
revoke all on public.consultations,public.consultation_access_tokens,public.consultation_notifications,public.consultation_notification_attempts,public.consultation_attachments from anon,authenticated;
grant all on public.consultations,public.consultation_access_tokens,public.consultation_notifications,public.consultation_notification_attempts,public.consultation_attachments to service_role;
grant usage,select on sequence public.consultation_notification_attempts_id_seq to service_role;

create function public.submit_native_consultation(p_request_id uuid,p_digest text,p_id uuid,p_input jsonb,p_token_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.consultations;
begin
  -- Transaction-scoped lock serializes simultaneous retries across all app instances.
  perform pg_advisory_xact_lock(hashtextextended('consultation:'||p_request_id::text,0));
  select * into saved from public.consultations where request_id=p_request_id;
  if found then
    if saved.request_digest<>p_digest then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  else
    if p_input->>'privacyAccepted'<>'true' or p_input->>'privacyVersion'<>'2026-10-29-native-v1' or (p_input->>'schemaVersion')::integer<>1 then
      raise exception 'invalid_consultation';
    end if;
    insert into public.consultations(id,submission_id,request_id,request_digest,country_code,name,email,phone,phone_country,address,monthly_kwh,consumption_profile,answers,privacy_version,consent_at)
    values(p_id,'ST-'||upper(replace(p_id::text,'-','')),p_request_id,p_digest,p_input->>'country',p_input->>'name',p_input->>'email',p_input->>'phone',p_input->>'phoneCountry',jsonb_build_object('full',p_input->>'address'),(p_input->>'monthlyKwh')::numeric,p_input->>'profile',p_input->'answers',p_input->>'privacyVersion',now()) returning * into saved;
    insert into public.consultation_access_tokens(token_hash,consultation_id) values(p_token_hash,saved.id);
    insert into public.consultation_notifications(consultation_id,kind,request_id) values(saved.id,'automatic',p_request_id);
  end if;
  return jsonb_build_object('id',saved.id,'submission_id',saved.submission_id,'country_code',saved.country_code,'submitted_at',saved.submitted_at);
end $$;
revoke all on function public.submit_native_consultation(uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_native_consultation(uuid,text,uuid,jsonb,text) to service_role;

create function public.queue_native_consultation_resend(p_id uuid,p_request_id uuid,p_actor_id uuid,p_actor_email text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.consultation_notifications;
begin
  perform pg_advisory_xact_lock(hashtextextended('consultation-resend:'||p_id::text,0));
  select * into job from public.consultation_notifications where request_id=p_request_id;
  if found then
    if job.consultation_id<>p_id or job.kind<>'manual' or job.actor_id<>p_actor_id then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
    return jsonb_build_object('status',job.status,'requestId',p_request_id,'retryAfter',5);
  end if;
  if exists(select 1 from public.consultation_notifications where consultation_id=p_id and kind='manual' and (status='pending' or created_at>now()-interval '1 minute')) then
    return jsonb_build_object('status','cooldown','retryAfter',60);
  end if;
  insert into public.consultation_notifications(consultation_id,kind,request_id,actor_id,actor_email)
    values(p_id,'manual',p_request_id,p_actor_id,p_actor_email);
  return jsonb_build_object('status','pending','requestId',p_request_id,'retryAfter',5);
end $$;
revoke all on function public.queue_native_consultation_resend(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.queue_native_consultation_resend(uuid,uuid,uuid,text) to service_role;

create function public.claim_consultation_notifications(p_limit integer default 5)
returns setof public.consultation_notifications language sql security invoker set search_path='' as $$
  update public.consultation_notifications n set lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),
    attempts=n.attempts+1,first_attempt_at=coalesce(n.first_attempt_at,now())
  where n.id in(select id from public.consultation_notifications where status='pending' and next_attempt_at<=now()
    and (lease_until is null or lease_until<now()) order by next_attempt_at,created_at for update skip locked limit least(greatest(p_limit,1),10)) returning n.*;
$$;
revoke all on function public.claim_consultation_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_consultation_notifications(integer) to service_role;
create function public.finish_consultation_notification(p_id uuid,p_lease uuid,p_status text,p_provider_id text,p_provider_status integer,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare job public.consultation_notifications;
begin
  select * into job from public.consultation_notifications where id=p_id and lease_token=p_lease and status='pending' for update;
  if not found then return false; end if;
  if p_status not in ('pending','accepted','failed') then raise exception 'invalid_status'; end if;
  insert into public.consultation_notification_attempts(notification_id,attempt,outcome,provider_status) values(job.id,job.attempts,p_status,p_provider_status);
  update public.consultation_notifications set status=p_status,provider_id=p_provider_id,provider_status=p_provider_status,last_error=left(p_error,250),
    lease_until=null,lease_token=null,next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,least(job.attempts,7)))::integer),
    completed_at=case when p_status<>'pending' then now() else null end where id=job.id;
  return true;
end $$;
revoke all on function public.finish_consultation_notification(uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.finish_consultation_notification(uuid,uuid,text,text,integer,text) to service_role;

-- Staff views expose only the new model. No historical Tally dependencies.
create view public.consultation_records with(security_invoker=true) as
 select c.id::text id,c.id consultation_id,'native'::text source,c.submission_id,c.country_code,
 case c.country_code when 'AG' then 'Antigua and Barbuda' else 'Dominica' end country_name,
 c.name,c.email,c.email_key,c.phone,c.phone_country,c.address,c.monthly_kwh,c.consumption_profile,c.answers,c.schema_version,c.submitted_at,c.received_at,
 null::jsonb payload,null::text form_id
 from public.consultations c;
create view public.consultation_contact_records with(security_invoker=true) as
 select md5(c.email_key)::uuid id,c.email_key email,count(*)::bigint submission_count,max(c.submitted_at) latest_submitted_at
 from public.consultations c group by c.email_key;
create view public.consultation_automatic_history with(security_invoker=true) as
 select n.id::text id,n.consultation_id::text tally_submission_row_id,n.created_at attempted_at,n.status,n.provider_id resend_email_id,n.provider_status resend_http_status
 from public.consultation_notifications n where n.kind='automatic';
create view public.consultation_manual_history with(security_invoker=true) as
 select n.request_id::text request_id,n.consultation_id::text tally_submission_row_id,n.created_at requested_at,n.status,n.actor_id requested_by,n.actor_email requested_by_email,n.provider_id resend_email_id,n.provider_status
 from public.consultation_notifications n where n.kind='manual';
revoke all on public.consultation_records,public.consultation_contact_records,public.consultation_automatic_history,public.consultation_manual_history from anon,authenticated;
grant select on public.consultation_records,public.consultation_contact_records,public.consultation_automatic_history,public.consultation_manual_history to service_role;
commit;
