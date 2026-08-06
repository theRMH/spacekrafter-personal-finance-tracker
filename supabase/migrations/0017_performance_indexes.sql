-- 0017_performance_indexes.sql
-- Columns filtered on nearly every page load (Transactions/Dashboard/Reports
-- status tabs, commitment status on Dashboard/Calendar, Settings audit
-- filters) had no supporting index — only owner_id/date/account did.

create index if not exists transactions_status_idx on transactions (status);
create index if not exists commitments_status_idx on commitments (status);
create index if not exists audit_log_entity_table_idx on audit_log (entity_table);
