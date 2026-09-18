-- Keep the column for compatibility with deployed readers that still use
-- expires_at > now(). PostgreSQL infinity means no scheduled expiry.
alter table public.consultation_preview_tokens
  alter column expires_at set default 'infinity'::timestamptz;

-- Preserve every existing token hash and URL, including previously expired
-- links. Deleted/revoked token rows are NOT recreated.
update public.consultation_preview_tokens
set expires_at = 'infinity'::timestamptz
where expires_at is distinct from 'infinity'::timestamptz;

comment on column public.consultation_preview_tokens.expires_at is
  'Legacy compatibility field. Preview links have no scheduled expiry (infinity). Revoke access by deleting the token row; keep the submission record.';

-- Existing RLS, service-role-only grants and token hashes remain unchanged.
