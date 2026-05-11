alter table public.score_transactions
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_score_transactions_academic_year_created_at
  on public.score_transactions (academic_year_id, created_at desc);

comment on column public.score_transactions.created_at is
  'System timestamp when the score transaction row was created. Used for recent activity ordering; recorded_at remains the event date/time.';
