-- 0011_accountant_role.sql
-- Accountant role v1: an Accountant is a second auth user (profiles.role='accountant')
-- linked to the Owner they work for via managed_owner_id. Scope for v1: View/Add/Import
-- only on Accounts/Import Statements/Add Entry — no edit/delete, no Investments/Reports/
-- Plans/Commitments/anything else. Enforced here at the RLS layer (not just hidden nav),
-- per the PRD's explicit "server-side enforcement" requirement — existing owner-only
-- policies are untouched; these are purely additive.

alter table profiles add column if not exists managed_owner_id uuid references auth.users (id) on delete cascade;

-- Owner needs to see the accountants they manage on Users & Access.
drop policy if exists "profiles_select_managed" on profiles;
create policy "profiles_select_managed" on profiles
  for select using (managed_owner_id = auth.uid());

-- Accounts: Accountant can view (not create/edit/delete) the Owner's accounts.
drop policy if exists "accounts_accountant_select" on accounts;
create policy "accounts_accountant_select" on accounts
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Categories/subcategories: read-only, needed to populate Add Entry's dropdowns.
drop policy if exists "categories_accountant_select" on categories;
create policy "categories_accountant_select" on categories
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

drop policy if exists "subcategories_accountant_select" on subcategories;
create policy "subcategories_accountant_select" on subcategories
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Category rules: read-only, needed by Import's auto-categorization.
drop policy if exists "category_rules_accountant_select" on category_rules;
create policy "category_rules_accountant_select" on category_rules
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Transactions: Accountant can view and add (Add Entry, Import) but not edit/delete.
drop policy if exists "transactions_accountant_select" on transactions;
create policy "transactions_accountant_select" on transactions
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

drop policy if exists "transactions_accountant_insert" on transactions;
create policy "transactions_accountant_insert" on transactions
  for insert with check (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Import batches: Accountant runs imports, needs to view history, create new
-- batches, and update the summary counts on the batch it just created (that
-- outcome summary is intrinsic to "running an Import", not a separate edit
-- capability — without this the Owner would see permanently-zero counts for
-- any import an Accountant runs).
drop policy if exists "import_batches_accountant_select" on import_batches;
create policy "import_batches_accountant_select" on import_batches
  for select using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

drop policy if exists "import_batches_accountant_insert" on import_batches;
create policy "import_batches_accountant_insert" on import_batches
  for insert with check (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

drop policy if exists "import_batches_accountant_update" on import_batches;
create policy "import_batches_accountant_update" on import_batches
  for update using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Import mappings: saved per-account column mapping, upserted on every import run.
drop policy if exists "import_mappings_accountant_all" on import_mappings;
create policy "import_mappings_accountant_all" on import_mappings
  for all using (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  ) with check (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );

-- Audit log: Accountant actions still get logged against the Owner's record set.
drop policy if exists "audit_log_accountant_insert" on audit_log;
create policy "audit_log_accountant_insert" on audit_log
  for insert with check (
    owner_id in (select managed_owner_id from profiles where id = auth.uid() and role = 'accountant')
  );
