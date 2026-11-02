-- Manual resends are separate from the webhook's original delivery audit.
create table public.consultation_email_resends (
  request_id uuid primary key,
  tally_submission_row_id bigint not null references public.tally_form_submissions(id) on delete cascade,
  requested_by uuid not null,
  requested_by_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'failed')),
  -- Private snapshot: keeps provider retries identical, including the preview link.
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  resend_email_id text,
  provider_status integer,
  requested_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  completed_at timestamptz
);
create index consultation_email_resends_submission_idx
  on public.consultation_email_resends(tally_submission_row_id, requested_at desc);
alter table public.consultation_email_resends enable row level security;
revoke all on public.consultation_email_resends from public, anon, authenticated, service_role;
grant select, insert, update on public.consultation_email_resends to service_role;

create function public.claim_consultation_email_resend(
  p_request_id uuid, p_submission_id bigint, p_actor_id uuid, p_actor_email text, p_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  attempt public.consultation_email_resends%rowtype;
  latest public.consultation_email_resends%rowtype;
  v_now timestamptz := clock_timestamp();
  wait_seconds integer;
begin
  if p_request_id is null or p_submission_id is null or p_actor_id is null
    or p_actor_email is null or length(p_actor_email) > 254
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid resend request';
  end if;
  -- Serialize claims across workers, tabs and employees for this consultation.
  perform pg_advisory_xact_lock(hashtextextended('consultation-resend:' || p_submission_id::text, 0));
  v_now := clock_timestamp();
  select * into attempt from public.consultation_email_resends where request_id = p_request_id;
  if found then
    if attempt.tally_submission_row_id <> p_submission_id then
      return jsonb_build_object('status', 'invalid');
    end if;
    if attempt.status <> 'pending' then
      return jsonb_build_object('status', attempt.status, 'request_id', attempt.request_id, 'retry_after', 60);
    end if;
  else
    select * into latest from public.consultation_email_resends
      where tally_submission_row_id = p_submission_id order by requested_at desc limit 1;
    if found and latest.status = 'pending' then
      attempt := latest;
    elsif found and latest.last_attempt_at > v_now - interval '60 seconds' then
      wait_seconds := greatest(1, ceil(extract(epoch from latest.last_attempt_at + interval '60 seconds' - v_now))::integer);
      return jsonb_build_object('status', 'cooldown', 'retry_after', wait_seconds);
    else
      insert into public.consultation_email_resends(request_id, tally_submission_row_id, requested_by, requested_by_email, payload, requested_at, last_attempt_at)
        values(p_request_id, p_submission_id, p_actor_id, p_actor_email, p_payload, v_now, v_now)
        returning * into attempt;
      return jsonb_build_object('status', 'send', 'request_id', attempt.request_id, 'payload', attempt.payload);
    end if;
  end if;
  -- Never replay an ambiguous request beyond the provider's 24-hour retention.
  -- Resolve the delivery with the provider before starting another operation.
  if attempt.requested_at < v_now - interval '23 hours' then
    return jsonb_build_object('status', 'uncertain', 'request_id', attempt.request_id);
  end if;
  if attempt.last_attempt_at > v_now - interval '15 seconds' then
    wait_seconds := greatest(1, ceil(extract(epoch from attempt.last_attempt_at + interval '15 seconds' - v_now))::integer);
    return jsonb_build_object('status', 'pending', 'request_id', attempt.request_id, 'retry_after', wait_seconds);
  end if;
  update public.consultation_email_resends set last_attempt_at = v_now where request_id = attempt.request_id;
  return jsonb_build_object('status', 'send', 'request_id', attempt.request_id, 'payload', attempt.payload);
end;
$$;
revoke all on function public.claim_consultation_email_resend(uuid, bigint, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_consultation_email_resend(uuid, bigint, uuid, text, jsonb) to service_role;
