alter table public.score_transactions
  add column if not exists category_name_at_record text,
  add column if not exists category_type_at_record text,
  add column if not exists requires_evidence_at_record boolean,
  add column if not exists requires_approval_at_record boolean;

comment on column public.score_transactions.category_name_at_record is
  'Snapshot of score category name when the transaction was recorded.';
comment on column public.score_transactions.category_type_at_record is
  'Snapshot of score category type when the transaction was recorded.';
comment on column public.score_transactions.requires_evidence_at_record is
  'Snapshot of whether evidence was required when the transaction was recorded. Null means legacy data before snapshot existed.';
comment on column public.score_transactions.requires_approval_at_record is
  'Snapshot of whether approval was required when the transaction was recorded. Null means legacy data before snapshot existed.';
