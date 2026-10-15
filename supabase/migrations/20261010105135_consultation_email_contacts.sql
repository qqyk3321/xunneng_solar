begin;
set local lock_timeout = '5s';

-- Block intake writes during the one-time backfill and trigger installation.
lock table public.tally_form_submissions in share row exclusive mode;

create schema consultation_contacts_private;
revoke all on schema consultation_contacts_private from public, anon, authenticated, service_role;

create table public.consultation_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email))),
  submission_count bigint not null check (submission_count > 0),
  latest_submitted_at timestamptz not null
);
alter table public.consultation_contacts enable row level security;
revoke all on public.consultation_contacts from public, anon, authenticated, service_role;
grant select on public.consultation_contacts to service_role;
create index consultation_contacts_latest_idx
  on public.consultation_contacts (latest_submitted_at desc, id);

-- Keep the submitted email and payload intact. This key alone groups history;
-- names, phone numbers, plus suffixes and dots never merge different emails.
alter table public.tally_form_submissions
  add column email_key text generated always as (lower(btrim(email))) stored;
create index tally_form_submissions_email_history_idx
  on public.tally_form_submissions (email_key, submitted_at desc, id desc);

insert into public.consultation_contacts(email, submission_count, latest_submitted_at)
  select email_key, count(*), max(submitted_at)
  from public.tally_form_submissions group by email_key;

create function consultation_contacts_private.sync_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  remaining bigint;
  next_email text;
begin
  if tg_op = 'TRUNCATE' then
    delete from public.consultation_contacts;
    return null;
  end if;
  if tg_op = 'INSERT' then
    -- Only committed insertions count: ON CONFLICT DO NOTHING never fires this
    -- AFTER INSERT trigger, and a failed statement rolls its changes back.
    insert into public.consultation_contacts as contacts(email, submission_count, latest_submitted_at)
      values(new.email_key, 1, new.submitted_at)
    on conflict (email) do update set
      submission_count = contacts.submission_count + 1,
      latest_submitted_at = greatest(contacts.latest_submitted_at, excluded.latest_submitted_at);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.email_key = new.email_key and old.submitted_at = new.submitted_at then return new; end if;
    next_email := new.email_key;
  end if;
  -- Serialize maintenance with insert upserts. A stable lock order also handles
  -- simultaneous email corrections moving records between existing groups.
  perform id from public.consultation_contacts
    where email in (old.email_key, next_email) order by email for update;

  if tg_op = 'DELETE' or old.email_key <> new.email_key then
    select submission_count into strict remaining from public.consultation_contacts where email = old.email_key;
    if remaining = 1 then
      delete from public.consultation_contacts where email = old.email_key;
    else
      update public.consultation_contacts set
        submission_count = submission_count - 1,
        -- A bulk move/delete has already removed all source rows before its
        -- row triggers drain. Keep the old timestamp until the last trigger
        -- removes that now-empty group within this same transaction.
        latest_submitted_at = coalesce(
          (select max(submitted_at) from public.tally_form_submissions where email_key = old.email_key),
          latest_submitted_at)
        where email = old.email_key;
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if old.email_key <> new.email_key then
      insert into public.consultation_contacts as contacts(email, submission_count, latest_submitted_at)
        values(new.email_key, 1, new.submitted_at)
      on conflict (email) do update set
        submission_count = contacts.submission_count + 1,
        latest_submitted_at = greatest(contacts.latest_submitted_at, excluded.latest_submitted_at);
    else
      update public.consultation_contacts set
        latest_submitted_at = (select max(submitted_at) from public.tally_form_submissions where email_key = new.email_key)
        where email = new.email_key;
    end if;
    return new;
  end if;
  return old;
end;
$$;
revoke all on function consultation_contacts_private.sync_history() from public, anon, authenticated, service_role;

create trigger consultation_contacts_insert after insert on public.tally_form_submissions
  for each row execute function consultation_contacts_private.sync_history();
create trigger consultation_contacts_update after update of email, submitted_at on public.tally_form_submissions
  for each row execute function consultation_contacts_private.sync_history();
create trigger consultation_contacts_delete after delete on public.tally_form_submissions
  for each row execute function consultation_contacts_private.sync_history();
create trigger consultation_contacts_truncate after truncate on public.tally_form_submissions
  for each statement execute function consultation_contacts_private.sync_history();

comment on table public.consultation_contacts is 'Email-only inquiry index, maintained transactionally on writes. No account, identity verification, name or CRM profile.';
notify pgrst, 'reload schema';
commit;
