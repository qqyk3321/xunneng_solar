-- Native-only names for staff email history. No reads from the retired tables.
begin;
alter view public.consultation_automatic_history rename column tally_submission_row_id to consultation_id;
alter view public.consultation_manual_history rename column tally_submission_row_id to consultation_id;
commit;
