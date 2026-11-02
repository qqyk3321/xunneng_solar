-- Timestamp windows keep the indexed column bare in the WHERE clause.
-- Retain the previous date RPC so an older deployment can safely roll back.
begin;
create index consultation_source_country_device_time_idx
  on public.consultation_submission_context(ip_country,device_kind,recorded_at);
create function public.consultation_source_window(
  p_from timestamptz,p_to timestamptz,p_step integer,p_country text default null,p_device text default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare stride interval; result jsonb;
begin
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to)
    or p_to<=p_from or p_to-p_from>interval '366 days'
    or p_step is null or p_step not in (300,900,3600,21600,86400,604800)
    or extract(epoch from p_to-p_from)/p_step>400
    or (p_country is not null and p_country<>'unknown' and p_country!~'^[A-Z]{2}$')
    or (p_device is not null and p_device not in ('desktop','mobile','tablet','bot','other','unknown')) then
    raise sqlstate '22023' using message='invalid_statistics_window';
  end if;
  stride := make_interval(secs=>p_step);
  with filtered as materialized (
    select recorded_at,ip_country,device_kind from public.consultation_submission_context
    where recorded_at>=p_from and recorded_at<p_to
      and (p_country is null or ip_country=p_country)
      and (p_device is null or device_kind=p_device)
  ), counts as (
    select date_bin(stride,recorded_at,'2000-01-03 00:00:00+08'::timestamptz) as bucket,count(*) as count
    from filtered group by 1
  ), ticks as (
    select generate_series(date_bin(stride,p_from,'2000-01-03 00:00:00+08'::timestamptz),
      date_bin(stride,p_to-interval '1 microsecond','2000-01-03 00:00:00+08'::timestamptz),stride) as bucket
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'series',(select coalesce(jsonb_agg(jsonb_build_object(
      'bucket',to_char(greatest(t.bucket,p_from) at time zone 'Asia/Shanghai','YYYY-MM-DD HH24:MI:SS'),
      'end',to_char(least(t.bucket+stride,p_to) at time zone 'Asia/Shanghai','YYYY-MM-DD HH24:MI:SS'),
      'count',coalesce(c.count,0)) order by t.bucket),'[]') from ticks t left join counts c using(bucket)),
    'countries',(select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc,key),'[]') from (select ip_country as key,count(*) as count from filtered group by 1) x),
    'devices',(select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',count) order by count desc,key),'[]') from (select device_kind as key,count(*) as count from filtered group by 1) x),
    'availableCountries',(select coalesce(jsonb_agg(key order by key),'[]') from (select distinct ip_country as key from public.consultation_submission_context where recorded_at>=p_from and recorded_at<p_to) x)
  ) into result;
  return result;
end $$;
revoke all on function public.consultation_source_window(timestamptz,timestamptz,integer,text,text) from public,anon,authenticated;
grant execute on function public.consultation_source_window(timestamptz,timestamptz,integer,text,text) to service_role;
comment on function public.consultation_source_window(timestamptz,timestamptz,integer,text,text) is 'Private first-submission aggregates for [from,to), Beijing-aligned bins clipped to the selected window. No edits or retries.';
notify pgrst,'reload schema';
commit;
