-- 0003_import_and_rules.sql
-- Statement import batches, saved column mappings, and keyword categorisation rules.

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id),
  file_name text not null,
  column_mapping jsonb not null,
  total_rows int not null default 0,
  accepted int not null default 0,
  duplicates int not null default 0,
  transfers int not null default 0,
  matched int not null default 0,
  unknown int not null default 0,
  rejected int not null default 0,
  created_at timestamptz not null default now()
);

alter table import_batches enable row level security;
drop policy if exists "import_batches_owner_all" on import_batches;
create policy "import_batches_owner_all" on import_batches
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists import_mappings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id),
  label text not null,
  column_mapping jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_id, account_id, label)
);

alter table import_mappings enable row level security;
drop policy if exists "import_mappings_owner_all" on import_mappings;
create policy "import_mappings_owner_all" on import_mappings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists category_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  keyword text not null,
  account_id uuid references accounts (id),
  category_id uuid not null references categories (id),
  subcategory_id uuid references subcategories (id),
  personal_or_office text check (personal_or_office in ('personal', 'office', 'shared')),
  priority int not null default 0,
  created_at timestamptz not null default now()
);

alter table category_rules enable row level security;
drop policy if exists "category_rules_owner_all" on category_rules;
create policy "category_rules_owner_all" on category_rules
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table transactions add column if not exists import_batch_id uuid references import_batches (id);
