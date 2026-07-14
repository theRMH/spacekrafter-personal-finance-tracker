-- 0006_plans.sql
-- Monthly Owner projections. Actual values are computed live from
-- confirmed transactions, not stored.

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  financial_year int not null,
  month int not null check (month between 1 and 12),
  plan_type text not null check (plan_type in ('personal_income', 'business_income', 'home_expense', 'office_expense', 'investment')),
  projected_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, financial_year, month, plan_type)
);

alter table plans enable row level security;
drop policy if exists "plans_owner_all" on plans;
create policy "plans_owner_all" on plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
