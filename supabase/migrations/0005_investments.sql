-- 0005_investments.sql
-- Shared investment shape covering all subtabs, plus 1:1 detail extensions
-- for Mutual Funds and Shares (the two subtabs with extra fields).

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  investment_type text not null check (investment_type in ('mutual_fund', 'share', 'fd_rd', 'ppf_nps', 'gold_bond', 'real_estate', 'business_capital', 'other')),
  name text not null,
  invested_amount numeric(14, 2) not null default 0,
  current_value numeric(14, 2),
  valuation_date date,
  start_date date,
  maturity_date date,
  nominee text,
  notes text,
  linked_account_id uuid references accounts (id),
  created_at timestamptz not null default now()
);

alter table investments enable row level security;
drop policy if exists "investments_owner_all" on investments;
create policy "investments_owner_all" on investments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists mutual_fund_details (
  investment_id uuid primary key references investments (id) on delete cascade,
  amc text,
  scheme_name text,
  category text check (category in ('debt', 'equity', 'hybrid', 'elss', 'other')),
  plan_type text,
  folio_number text,
  agent_advisor text,
  investment_mode text check (investment_mode in ('sip', 'lump_sum')),
  sip_amount numeric(14, 2),
  sip_frequency text,
  units numeric(18, 4)
);

alter table mutual_fund_details enable row level security;
drop policy if exists "mutual_fund_details_owner_all" on mutual_fund_details;
create policy "mutual_fund_details_owner_all" on mutual_fund_details
  for all using (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = auth.uid())
  ) with check (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = auth.uid())
  );

create table if not exists share_details (
  investment_id uuid primary key references investments (id) on delete cascade,
  company_name text,
  symbol text,
  sector text,
  broker text,
  demat_account text,
  quantity numeric(18, 4),
  average_purchase_price numeric(14, 2)
);

alter table share_details enable row level security;
drop policy if exists "share_details_owner_all" on share_details;
create policy "share_details_owner_all" on share_details
  for all using (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = auth.uid())
  ) with check (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = auth.uid())
  );
