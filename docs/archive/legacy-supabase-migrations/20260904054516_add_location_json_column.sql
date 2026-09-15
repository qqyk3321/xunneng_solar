alter table public.tally_form_submissions
  add column if not exists location_json jsonb;

update public.tally_form_submissions
set location_json = (
  select (field ->> 'value')::jsonb
  from jsonb_array_elements(payload #> '{data,fields}') as field
  where field ->> 'label' = 'location_json'
  limit 1
)
where payload #> '{data,fields}' is not null;
