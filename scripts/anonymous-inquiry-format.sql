-- HISTORICAL REFERENCE ONLY. Current projects must use supabase/migrations via db push.
-- Local contact preview only. Nullable field preserves existing records unchanged.
begin;
alter table public.anonymous_inquiries_preview add column if not exists format text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.anonymous_inquiries_preview'::regclass and conname = 'anonymous_inquiries_preview_format_check') then
    alter table public.anonymous_inquiries_preview add constraint anonymous_inquiries_preview_format_check check (format in ('plain', 'rich'));
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
