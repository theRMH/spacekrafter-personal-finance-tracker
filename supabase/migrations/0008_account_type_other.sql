-- 0008_account_type_other.sql
-- Adds an "Other" account type for owners whose account doesn't fit the
-- 5 presets (ACC-01). Business logic (e.g. cash vs provisional entries)
-- only special-cases 'cash', so 'other' behaves like a normal non-cash
-- account by default.

alter table accounts drop constraint if exists accounts_type_check;
alter table accounts add constraint accounts_type_check
  check (type in ('bank', 'credit_card', 'upi_wallet', 'cash', 'loan', 'other'));
