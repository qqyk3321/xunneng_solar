-- Run only against the new project after setup-tally-intake.sql.
begin;
-- Supabase default privileges can grant more than the intake needs.
revoke all on public.tally_form_submissions from service_role;
grant select, insert on public.tally_form_submissions to service_role;
revoke all on sequence public.tally_form_submissions_id_seq from service_role;
grant usage, select on sequence public.tally_form_submissions_id_seq to service_role;
-- New-project platform event trigger: it need not be callable by Data API roles.
-- Do not remove the event trigger or change its RLS-enabling behavior.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
commit;
