-- Standalone additive preview schema upgrade; existing rows remain unchanged.
begin;
alter table public.anonymous_inquiries_preview
  add column content jsonb;
alter table public.anonymous_inquiries_preview
  add constraint anonymous_inquiries_preview_content_shape
  check (content is null or (
    jsonb_typeof(content) = 'object'
    and content->>'type' = 'doc'
    and jsonb_typeof(content->'content') = 'array'
    and octet_length(content::text) <= 262144
  ) is true);
comment on column public.anonymous_inquiries_preview.content is
  'Rich content v1: allowlisted Tiptap JSON; inquiryImage.attrs.id maps to images[].id and private Storage path. NULL for legacy plain-text submissions. No HTML, blob, data or signed URLs.';
notify pgrst, 'reload schema';
commit;
