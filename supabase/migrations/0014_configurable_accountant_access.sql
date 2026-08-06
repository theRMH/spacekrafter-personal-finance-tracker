-- 0014_configurable_accountant_access.sql
-- Replaces the fixed Accountant page set with an Owner-controlled checklist.
-- Design kept from the v1 Accountant role: an Accountant can always View +
-- Add on whatever pages the Owner grants; Edit + Delete stay Owner-exclusive
-- everywhere, on every page, granted or not — this migration only changes
-- WHICH pages are visible/queryable, not what an Accountant can do on them.
-- Existing owner-only policies are untouched; everything here is additive.

alter table profiles add column if not exists allowed_pages text[] not null default '{}';

-- Backfill the one existing Accountant with exactly what they could already
-- do, so shipping this doesn't silently take anything away.
update profiles
set allowed_pages = array['/accounts', '/import', '/add-entry', '/transactions']
where role = 'accountant' and allowed_pages = '{}';

-- Helper functions so every policy below doesn't repeat the same subquery.
-- security definer: these read `profiles` themselves, so they need to see
-- past the caller's own row-level policies to check role/allowed_pages.
create or replace function accountant_has_access(page text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'accountant' and page = any(allowed_pages)
  );
$$;

create or replace function accountant_managed_owner()
returns uuid
language sql
security definer
stable
as $$
  select managed_owner_id from profiles where id = auth.uid() and role = 'accountant';
$$;

-- ---------------------------------------------------------------------
-- profiles: Owner manages the checklist; a delegate Accountant with
-- '/users-access' granted can see the roster and invite (a create action),
-- but toggling permissions is an edit action — stays Owner-only, no exception.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_owner_update_managed" on profiles;
create policy "profiles_owner_update_managed" on profiles
  for update using (managed_owner_id = auth.uid()) with check (managed_owner_id = auth.uid());

drop policy if exists "profiles_select_siblings_via_access" on profiles;
create policy "profiles_select_siblings_via_access" on profiles
  for select using (managed_owner_id = accountant_managed_owner() and accountant_has_access('/users-access'));

drop policy if exists "profiles_select_owner_via_access" on profiles;
create policy "profiles_select_owner_via_access" on profiles
  for select using (id = accountant_managed_owner() and accountant_has_access('/users-access'));

-- Close a pre-existing gap: profiles_update_own (0001_init.sql) has no WITH
-- CHECK, so Postgres reuses its USING clause for both directions — meaning
-- any authenticated user could otherwise update ANY column on their own row
-- via a raw API call, including `role` itself (self-escalating to owner) or
-- `managed_owner_id`. Column-level privilege is the right layer for this,
-- not a row policy: only `full_name` is ever legitimately self-editable
-- (password changes go through Supabase Auth, not this table), and
-- `allowed_pages` is the one column the Owner's checklist above needs to
-- write on a DIFFERENT row. Every other column — role, managed_owner_id —
-- becomes unreachable from the client for every role, permanently, no
-- exception, regardless of which page-access grants exist.
revoke update on profiles from authenticated;
grant update (full_name, allowed_pages) on profiles to authenticated;

-- ---------------------------------------------------------------------
-- accounts — used by: /dashboard, /transactions, /accounts, /import, /add-entry,
-- plus every commitment/investment page's "linked account" dropdown.
-- ---------------------------------------------------------------------
drop policy if exists "accounts_accountant_select" on accounts;
create policy "accounts_accountant_select" on accounts
  for select using (
    owner_id = accountant_managed_owner() and (
      accountant_has_access('/dashboard') or accountant_has_access('/transactions') or
      accountant_has_access('/accounts') or accountant_has_access('/import') or accountant_has_access('/add-entry') or
      accountant_has_access('/insurance') or accountant_has_access('/utilities') or accountant_has_access('/subscriptions') or
      accountant_has_access('/income-sources') or accountant_has_access('/investments') or accountant_has_access('/plans') or
      accountant_has_access('/calendar') or accountant_has_access('/reports')
    )
  );

drop policy if exists "accounts_accountant_insert" on accounts;
create policy "accounts_accountant_insert" on accounts
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/accounts'));

-- ---------------------------------------------------------------------
-- categories / subcategories / category_rules — read by Add Entry, Import,
-- Transactions' filter bar, and managed on Settings.
-- ---------------------------------------------------------------------
drop policy if exists "categories_accountant_select" on categories;
create policy "categories_accountant_select" on categories
  for select using (
    owner_id = accountant_managed_owner() and (
      accountant_has_access('/add-entry') or accountant_has_access('/import') or
      accountant_has_access('/transactions') or accountant_has_access('/settings') or accountant_has_access('/plans')
    )
  );

drop policy if exists "categories_accountant_insert" on categories;
create policy "categories_accountant_insert" on categories
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/settings'));

drop policy if exists "subcategories_accountant_select" on subcategories;
create policy "subcategories_accountant_select" on subcategories
  for select using (
    owner_id = accountant_managed_owner() and (
      accountant_has_access('/add-entry') or accountant_has_access('/import') or
      accountant_has_access('/transactions') or accountant_has_access('/settings')
    )
  );

drop policy if exists "subcategories_accountant_insert" on subcategories;
create policy "subcategories_accountant_insert" on subcategories
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/settings'));

drop policy if exists "category_rules_accountant_select" on category_rules;
create policy "category_rules_accountant_select" on category_rules
  for select using (
    owner_id = accountant_managed_owner() and (accountant_has_access('/import') or accountant_has_access('/settings'))
  );

drop policy if exists "category_rules_accountant_insert" on category_rules;
create policy "category_rules_accountant_insert" on category_rules
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/settings'));

-- ---------------------------------------------------------------------
-- transactions — select for Dashboard/Transactions/Reports/Plans; insert for
-- Add Entry and Import. Kept exactly as wide as the old fixed policy, just
-- gated now instead of unconditional.
-- ---------------------------------------------------------------------
drop policy if exists "transactions_accountant_select" on transactions;
create policy "transactions_accountant_select" on transactions
  for select using (
    owner_id = accountant_managed_owner() and (
      accountant_has_access('/dashboard') or accountant_has_access('/transactions') or
      accountant_has_access('/reports') or accountant_has_access('/plans') or accountant_has_access('/calendar')
    )
  );

drop policy if exists "transactions_accountant_insert" on transactions;
create policy "transactions_accountant_insert" on transactions
  for insert with check (
    owner_id = accountant_managed_owner() and (accountant_has_access('/add-entry') or accountant_has_access('/import'))
  );

-- ---------------------------------------------------------------------
-- import_batches / import_mappings — unchanged shape, just gated by '/import'.
-- ---------------------------------------------------------------------
drop policy if exists "import_batches_accountant_select" on import_batches;
create policy "import_batches_accountant_select" on import_batches
  for select using (owner_id = accountant_managed_owner() and accountant_has_access('/import'));

drop policy if exists "import_batches_accountant_insert" on import_batches;
create policy "import_batches_accountant_insert" on import_batches
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/import'));

drop policy if exists "import_batches_accountant_update" on import_batches;
create policy "import_batches_accountant_update" on import_batches
  for update using (owner_id = accountant_managed_owner() and accountant_has_access('/import'));

drop policy if exists "import_mappings_accountant_all" on import_mappings;
create policy "import_mappings_accountant_all" on import_mappings
  for all using (owner_id = accountant_managed_owner() and accountant_has_access('/import'))
  with check (owner_id = accountant_managed_owner() and accountant_has_access('/import'));

-- ---------------------------------------------------------------------
-- commitments + detail tables — previously fully blocked for Accountants.
-- Select scoped per commitment_type to its own page (plus the cross-cutting
-- pages that peek at commitments regardless of type); insert scoped to the
-- specific creating page.
-- ---------------------------------------------------------------------
drop policy if exists "commitments_accountant_select" on commitments;
create policy "commitments_accountant_select" on commitments
  for select using (
    owner_id = accountant_managed_owner() and (
      accountant_has_access('/dashboard') or accountant_has_access('/calendar') or
      accountant_has_access('/add-entry') or accountant_has_access('/import') or accountant_has_access('/plans') or
      (commitment_type = 'insurance' and accountant_has_access('/insurance')) or
      (commitment_type = 'utility' and accountant_has_access('/utilities')) or
      (commitment_type = 'subscription' and accountant_has_access('/subscriptions')) or
      (commitment_type = 'expected_income' and accountant_has_access('/income-sources'))
    )
  );

drop policy if exists "commitments_accountant_insert" on commitments;
create policy "commitments_accountant_insert" on commitments
  for insert with check (
    owner_id = accountant_managed_owner() and (
      (commitment_type = 'insurance' and accountant_has_access('/insurance')) or
      (commitment_type = 'utility' and accountant_has_access('/utilities')) or
      (commitment_type = 'subscription' and accountant_has_access('/subscriptions')) or
      (commitment_type = 'expected_income' and accountant_has_access('/income-sources'))
    )
  );

drop policy if exists "insurance_details_accountant_all" on insurance_details;
create policy "insurance_details_accountant_all" on insurance_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/insurance')
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/insurance')
  );

drop policy if exists "utility_details_accountant_all" on utility_details;
create policy "utility_details_accountant_all" on utility_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/utilities')
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/utilities')
  );

drop policy if exists "subscription_details_accountant_all" on subscription_details;
create policy "subscription_details_accountant_all" on subscription_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/subscriptions')
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/subscriptions')
  );

drop policy if exists "income_source_details_accountant_all" on income_source_details;
create policy "income_source_details_accountant_all" on income_source_details
  for all using (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/income-sources')
  ) with check (
    exists (select 1 from commitments c where c.id = commitment_id and c.owner_id = accountant_managed_owner())
    and accountant_has_access('/income-sources')
  );
-- Note: detail-table policies above use `for all` (not select+insert split)
-- because they're 1:1 extension rows created/updated together with their
-- commitment row in the same request — same pattern the owner-only policies
-- for these tables already use. The parent `commitments` row itself is
-- still select+insert only for Accountants, so this doesn't grant edit/delete
-- on the commitment itself, only lets its own detail row be written alongside it.

-- ---------------------------------------------------------------------
-- investments + detail tables — gated by '/investments' only.
-- ---------------------------------------------------------------------
drop policy if exists "investments_accountant_select" on investments;
create policy "investments_accountant_select" on investments
  for select using (
    owner_id = accountant_managed_owner() and (accountant_has_access('/investments') or accountant_has_access('/dashboard') or accountant_has_access('/reports'))
  );

drop policy if exists "investments_accountant_insert" on investments;
create policy "investments_accountant_insert" on investments
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/investments'));

drop policy if exists "mutual_fund_details_accountant_all" on mutual_fund_details;
create policy "mutual_fund_details_accountant_all" on mutual_fund_details
  for all using (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = accountant_managed_owner())
    and accountant_has_access('/investments')
  ) with check (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = accountant_managed_owner())
    and accountant_has_access('/investments')
  );

drop policy if exists "share_details_accountant_all" on share_details;
create policy "share_details_accountant_all" on share_details
  for all using (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = accountant_managed_owner())
    and accountant_has_access('/investments')
  ) with check (
    exists (select 1 from investments i where i.id = investment_id and i.owner_id = accountant_managed_owner())
    and accountant_has_access('/investments')
  );

-- ---------------------------------------------------------------------
-- plans — gated by '/plans'.
-- ---------------------------------------------------------------------
drop policy if exists "plans_accountant_select" on plans;
create policy "plans_accountant_select" on plans
  for select using (owner_id = accountant_managed_owner() and accountant_has_access('/plans'));

drop policy if exists "plans_accountant_insert" on plans;
create policy "plans_accountant_insert" on plans
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/plans'));

-- ---------------------------------------------------------------------
-- approval_requests — gated by '/approvals'.
-- ---------------------------------------------------------------------
drop policy if exists "approval_requests_accountant_select" on approval_requests;
create policy "approval_requests_accountant_select" on approval_requests
  for select using (owner_id = accountant_managed_owner() and accountant_has_access('/approvals'));

drop policy if exists "approval_requests_accountant_insert" on approval_requests;
create policy "approval_requests_accountant_insert" on approval_requests
  for insert with check (owner_id = accountant_managed_owner() and accountant_has_access('/approvals'));

-- ---------------------------------------------------------------------
-- audit_log — select gated by '/settings' (where the Audit history section
-- lives); insert stays as-is (every accountant action gets logged regardless
-- of which pages they can see).
-- ---------------------------------------------------------------------
drop policy if exists "audit_log_accountant_select" on audit_log;
create policy "audit_log_accountant_select" on audit_log
  for select using (owner_id = accountant_managed_owner() and accountant_has_access('/settings'));

drop policy if exists "audit_log_accountant_insert" on audit_log;
create policy "audit_log_accountant_insert" on audit_log
  for insert with check (owner_id = accountant_managed_owner());
