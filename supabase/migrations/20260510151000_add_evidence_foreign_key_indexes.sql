create index if not exists idx_score_transaction_evidence_transaction_id
  on public.score_transaction_evidence (transaction_id);

create index if not exists idx_score_transaction_evidence_uploaded_by
  on public.score_transaction_evidence (uploaded_by);
