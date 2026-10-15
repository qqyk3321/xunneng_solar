-- Deploy and verify the link-only email function before applying this migration.
begin;
drop trigger tally_confirmation_pricing on public.tally_form_submissions;
drop function quote_pricing_private.freeze_confirmation_pricing();
alter table public.tally_form_submissions drop column confirmation_pricing;
notify pgrst,'reload schema';
commit;
