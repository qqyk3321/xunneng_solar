-- Save the reused two-page assessment card as one atomic, idempotent revision.
begin;
alter table public.consultation_changes drop constraint consultation_changes_section_check;
alter table public.consultation_changes add constraint consultation_changes_section_check check(section in ('contact','electricity','property','assessment'));
create or replace function public.update_native_consultation(p_id uuid,p_token_hash text,p_request_id uuid,p_digest text,p_revision integer,p_section text,p_input jsonb,p_environment jsonb default '{}')
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
  if p_section='assessment' then
    before_data=jsonb_build_object('name',saved.name,'email',saved.email,'phone',saved.phone,'phoneCountry',saved.phone_country,
      'address',saved.address->>'full','monthlyKwh',saved.monthly_kwh,'profile',saved.consumption_profile,'answers',saved.answers);
    after_data=jsonb_build_object('name',p_input->>'name','email',p_input->>'email','phone',p_input->>'phone','phoneCountry',p_input->>'phoneCountry',
      'address',p_input->>'address','monthlyKwh',(p_input->>'monthlyKwh')::numeric,'profile',p_input->>'profile','answers',p_input->'answers');
    update public.consultations set name=p_input->>'name',email=p_input->>'email',phone=p_input->>'phone',phone_country=p_input->>'phoneCountry',
      address=jsonb_build_object('full',p_input->>'address'),monthly_kwh=(p_input->>'monthlyKwh')::numeric,
      consumption_profile=p_input->>'profile',answers=p_input->'answers' where id=p_id;
    if lower(btrim(saved.email))<>lower(btrim(p_input->>'email')) then
      update public.consultation_recovery_requests set expires_at=now() where email_key=saved.email_key and country_code=saved.country_code;
    end if;
  elsif p_section='contact' then
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
