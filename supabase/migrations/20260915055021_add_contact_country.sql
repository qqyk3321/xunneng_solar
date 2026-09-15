-- Additive: historical submissions remain unknown, never infer a country.
begin;
alter table public.anonymous_inquiries_preview
  add column country_code text check (country_code in ('AG', 'DM')),
  add column country_name text generated always as (
    case country_code when 'AG' then 'Antigua and Barbuda' when 'DM' then 'Dominica' end
  ) stored;
comment on column public.anonymous_inquiries_preview.country_code is
  'User-selected installation region from the website URL, validated by the API. Not verified residence or authorization. NULL for historical submissions.';
notify pgrst, 'reload schema';
commit;
