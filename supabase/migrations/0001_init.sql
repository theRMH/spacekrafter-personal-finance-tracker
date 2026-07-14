-- 0001_init.sql
-- Draft/test vertical slice schema: profiles, accounts, categories,
-- subcategories, transactions (manual entries only). Owner-only RLS —
-- Accountant scoping is deferred to a later milestone.
--
-- IMPORTANT: this file is idempotent (safe to re-run) via IF NOT EXISTS /
-- DROP POLICY IF EXISTS guards, but is NOT applied automatically. Run via
-- `npm run migrate` once DATABASE_URL is set in .env.local.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'accountant')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'credit_card', 'upi_wallet', 'cash', 'loan')),
  personal_or_office text not null check (personal_or_office in ('personal', 'office')),
  currency text not null default 'INR',
  opening_balance numeric(14, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;

drop policy if exists "accounts_owner_all" on accounts;
create policy "accounts_owner_all" on accounts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- categories / subcategories
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  group_name text not null,
  name text not null,
  default_personal_or_office text check (default_personal_or_office in ('personal', 'office')),
  created_at timestamptz not null default now(),
  unique (owner_id, group_name, name)
);

alter table categories enable row level security;

drop policy if exists "categories_owner_all" on categories;
create policy "categories_owner_all" on categories
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

alter table subcategories enable row level security;

drop policy if exists "subcategories_owner_all" on subcategories;
create policy "subcategories_owner_all" on subcategories
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- transactions (manual entries only in this slice)
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  transaction_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense', 'transfer')),
  personal_or_office text not null check (personal_or_office in ('personal', 'office', 'shared')),
  account_id uuid not null references accounts (id),
  category_id uuid references categories (id),
  subcategory_id uuid references subcategories (id),
  payee_payer text,
  reference text,
  narration text,
  status text not null default 'confirmed' check (status in ('confirmed')),
  source text not null default 'manual' check (source in ('manual')),
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

drop policy if exists "transactions_owner_all" on transactions;
create policy "transactions_owner_all" on transactions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists transactions_owner_date_idx on transactions (owner_id, transaction_date desc);
create index if not exists transactions_account_idx on transactions (account_id);
