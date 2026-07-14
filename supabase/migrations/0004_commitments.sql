-- 0004_commitments.sql
-- Shared commitment shape (Insurance/Utilities/Subscriptions/EMI/SIP/expected income)
-- plus 1:1 detail extension tables for type-specific fields.

create table if not exists commitments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  commitment_type text not null check (commitment_type in ('insurance', 'utility', 'subscription', 'emi', 'sip', 'expected_income', 'other')),
  name text not null,
  personal_or_office text not null check (personal_or_office in ('personal', 'office')),
  expected_amount numeric(14, 2),
  frequency text not null check (frequency in ('one_time', 'monthly', 'quarterly', 'half_yearly', 'annual', 'custom')),
  due_date date not null,
  linked_account_id uuid references accounts (id),
  provider text,
  reminder_lead_days int not null default 7,
  status text not null default 'upcoming' check (status in ('upcoming', 'due', 'overdue', 'paid', 'paused', 'cancelled', 'expired')),
  linked_transaction_id uuid references transactions (id),
  created_at timestamptz not null default now()
);

alter table commitments enable row level security;
drop policy if exists "commitments_owner_all" on commitments;
create policy "commitments_owner_all" on commitments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists commitments_owner_due_idx on commitments (owner_id, due_date);

create table if not exists insurance_details (
  commitment_id uuid primary key references commitments (id) on delete cascade,
  insurance_type text not null,
  policy_number text,
  insured_person_or_asset text,
  nominee text,
  agent_details text
);

alter table insurance_details enable row level security;
drop policy if exists "insurance_details_owner_all" on insurance_details;
create policy "insurance_details_owner_all" on insurance_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  );

create table if not exists utility_details (
  commitment_id uuid primary key references commitments (id) on delete cascade,
  utility_type text not null,
  location text not null,
  consumer_number text,
  billing_cycle text
);

alter table utility_details enable row level security;
drop policy if exists "utility_details_owner_all" on utility_details;
create policy "utility_details_owner_all" on utility_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  );

create table if not exists subscription_details (
  commitment_id uuid primary key references commitments (id) on delete cascade,
  category text,
  plan text,
  auto_renew boolean not null default false,
  reference_notes text
);

alter table subscription_details enable row level security;
drop policy if exists "subscription_details_owner_all" on subscription_details;
create policy "subscription_details_owner_all" on subscription_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = auth.uid())
  );

alter table transactions add column if not exists linked_commitment_id uuid references commitments (id);
