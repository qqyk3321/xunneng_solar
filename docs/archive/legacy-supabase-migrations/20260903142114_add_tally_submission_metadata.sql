alter table public.tally_form_submissions
  add column if not exists response_id text,
  add column if not exists respondent_id text,
  add column if not exists submission_pdf_url text,
  add column if not exists submission_preview_url text;

update public.tally_form_submissions
set
  response_id = coalesce(response_id, payload #>> '{data,responseId}'),
  respondent_id = coalesce(respondent_id, payload #>> '{data,respondentId}'),
  submission_pdf_url = coalesce(submission_pdf_url, payload #>> '{data,submissionPdfUrl}'),
  submission_preview_url = coalesce(submission_preview_url, payload #>> '{data,submissionPreviewUrl}')
where payload ? 'data';

create index if not exists tally_form_submissions_response_id_idx
  on public.tally_form_submissions (response_id);

create index if not exists tally_form_submissions_respondent_id_idx
  on public.tally_form_submissions (respondent_id);
