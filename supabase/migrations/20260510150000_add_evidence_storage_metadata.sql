alter table public.score_transaction_evidence
  add column if not exists file_url text,
  add column if not exists storage_provider text not null default 'supabase';

comment on column public.score_transaction_evidence.file_url is 'Public or shareable URL for evidence file. Supabase legacy rows can derive this from file_path.';
comment on column public.score_transaction_evidence.storage_provider is 'Storage provider for the evidence file, e.g. supabase or google_drive.';
