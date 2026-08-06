-- 0015_loan_received_paid.sql
-- Split the single "Loan" transaction type into "Loan Received" and "Loan
-- Paid" (mirroring Advance Received/Advance Paid) — no existing rows use
-- 'loan', so it's dropped outright rather than kept alongside the new pair.

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer', 'investment', 'advance_received', 'advance_paid', 'loan_received', 'loan_paid'));
