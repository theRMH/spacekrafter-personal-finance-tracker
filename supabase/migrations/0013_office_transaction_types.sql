-- 0013_office_transaction_types.sql
-- Office-only Add Entry types: Advance Received, Advance Paid, Loan
-- (Transfer and Investment already existed in the check constraint but were
-- previously only reachable via Import/unused — now selectable in the form).

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer', 'investment', 'advance_received', 'advance_paid', 'loan'));
