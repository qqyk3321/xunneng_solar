-- First-submit facts only: retries reuse the existing context row and edits live elsewhere.
begin;
alter table public.consultation_submission_context
  add column ip_country text generated always as (
    case when environment #>> '{ipGeo,countryCode}' ~ '^[A-Z]{2}$'
      and environment #>> '{ipGeo,countryCode}' <> 'ZZ'
      then environment #>> '{ipGeo,countryCode}' else 'unknown' end
  ) stored,
  add column device_kind text generated always as (
    case when environment->>'device' in ('desktop','mobile','tablet','bot') then environment->>'device'
      when coalesce(environment->>'device','') in ('','unknown') then 'unknown' else 'other' end
  ) stored;
create index consultation_source_time_idx on public.consultation_submission_context(recorded_at) include(ip_country,device_kind);
create index consultation_source_country_time_idx on public.consultation_submission_context(ip_country,recorded_at) include(device_kind);
create index consultation_source_device_time_idx on public.consultation_submission_context(device_kind,recorded_at) include(ip_country);

create function public.consultation_source_statistics(
  p_from date,p_to date,p_bucket text default 'day',p_country text default null,p_device text default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare start_at timestamptz; end_at timestamptz; result jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to-p_from > 365
    or p_bucket is null or p_bucket not in ('hour','day','week','month')
    or (p_bucket='hour' and p_to-p_from>30)
    or (p_country is not null and p_country <> 'unknown' and p_country !~ '^[A-Z]{2}$')
    or (p_device is not null and p_device not in ('desktop','mobile','tablet','bot','other','unknown')) then
    raise sqlstate '22023' using message='invalid_statistics_range';
  end if;
  start_at := p_from::timestamp at time zone 'Asia/Shanghai';
  end_at := (p_to+1)::timestamp at time zone 'Asia/Shanghai';
  with filtered as materialized (
    select recorded_at,ip_country,device_kind from public.consultation_submission_context
    where recorded_at>=start_at and recorded_at<end_at
      and (p_country is null or ip_country=p_country)
      and (p_device is null or device_kind=p_device)
  ), counts as (
    select date_trunc(p_bucket,recorded_at at time zone 'Asia/Shanghai') as bucket,count(*) as count
    from filtered group by 1
  ), ticks as (
    select generate_series(date_trunc(p_bucket,p_from::timestamp),
      date_trunc(p_bucket,(p_to+1)::timestamp - interval '1 microsecond'),
      ('1 '||p_bucket)::interval) as bucket
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'series',(select coalesce(jsonb_agg(jsonb_build_object('bucket',to_char(t.bucket,'YYYY-MM-DD HH24:MI'),'count',coalesce(c.count,0)) order by t.bucket),'[]') from ticks t left join counts c using(bucket)),
    'countries',(select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc,key),'[]') from (select ip_country as key,count(*) as count from filtered group by 1) x),
    'devices',(select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc,key),'[]') from (select device_kind as key,count(*) as count from filtered group by 1) x),
    'availableCountries',(select coalesce(jsonb_agg(key order by key),'[]') from (select distinct ip_country as key from public.consultation_submission_context where recorded_at>=start_at and recorded_at<end_at) x)
  ) into result;
  return result;
end $$;
revoke all on function public.consultation_source_statistics(date,date,text,text,text) from public,anon,authenticated;
grant execute on function public.consultation_source_statistics(date,date,text,text,text) to service_role;
comment on function public.consultation_source_statistics(date,date,text,text,text) is 'Private first-submission source aggregates; inclusive Beijing dates, Monday weeks. Excludes all edits and idempotent retries.';
notify pgrst,'reload schema';
commit;
