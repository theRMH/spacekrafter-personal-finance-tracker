-- 0009_income_sources.sql
-- Named recurring income sources, using the existing commitments shape
-- (commitment_type = 'expected_income' already allowed, previously unused)
-- plus a 1:1 detail extension table, same pattern as insurance/utility/subscription_details.

create table if not exists income_source_details (
  commitment_id uuid primary key references commitments (id) on delete cascade,
  income_type text not null,
  payer_or_property text,
  notes text
);

alter table income_source_details enable row level security;
drop policy if exists "income_source_details_owner_all" on income_source_details;
create policy "income_source_details_owner_all" on income_source_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  );
