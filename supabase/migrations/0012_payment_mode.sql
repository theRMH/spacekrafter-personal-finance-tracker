-- 0012_payment_mode.sql
-- Payment mode (UPI/IMPS/NEFT/Card/Cash/etc.) — auto-detected from bank
-- statement narrations during Import, optionally set manually on Add Entry.

alter table transactions add column if not exists payment_mode text;
