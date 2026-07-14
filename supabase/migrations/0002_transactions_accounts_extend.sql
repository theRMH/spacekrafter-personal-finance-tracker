-- 0002_transactions_accounts_extend.sql
-- Adds investment transaction type, provisional/needs_review statuses,
-- duplicate fingerprinting, transfer linking, soft delete, and account
-- reconciliation fields.

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer', 'investment'));

alter table transactions drop constraint if exists transactions_status_check;
alter table transactions add constraint transactions_status_check
  check (status in ('confirmed', 'provisional', 'needs_review'));

alter table transactions drop constraint if exists transactions_source_check;
alter table transactions add constraint transactions_source_check
  check (source in ('manual', 'imported'));

alter table transactions add column if not exists fingerprint text;
alter table transactions add column if not exists transfer_pair_id uuid references transactions (id);
alter table transactions add column if not exists deleted_at timestamptz;

create unique index if not exists transactions_account_fingerprint_idx
  on transactions (account_id, fingerprint)
  where fingerprint is not null and deleted_at is null;

alter table accounts add column if not exists statement_closing_balance numeric(14, 2);
alter table accounts add column if not exists last_imported_at timestamptz;
alter table accounts add column if not exists reconciliation_status text
  not null default 'not_started'
  check (reconciliation_status in ('not_started', 'in_progress', 'difference', 'reconciled'));
