-- Apply only after the staff app uses apply_current_quote_plan and current-row
-- reconciliation. Full publication results are stored in staff only.
begin;
lock table public.quote_plan_publications in access exclusive mode;
do $$ begin
  if exists(select 1 from public.quote_plan_publications) then
    raise exception 'A legacy publication appeared during rollout; reconcile it in staff before retiring this table';
  end if;
end $$;
drop function public.publish_quote_plan(uuid,uuid,integer,jsonb);
drop function quote_pricing_private.publish_plan(uuid,uuid,integer,jsonb);
drop table public.quote_plan_publications;
comment on table public.quote_pricing_settings is
  'Exactly one current published pricing configuration. No business-side plan, publication or audit history. All history lives in staff.';
notify pgrst,'reload schema';
commit;
