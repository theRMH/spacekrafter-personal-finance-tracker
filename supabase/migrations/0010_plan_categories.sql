-- 0010_plan_categories.sql
-- Extends `plans` to support per-category projections alongside the existing
-- 5 coarse monthly buckets, without touching any existing bucket rows or the
-- existing bucket upsert's ON CONFLICT target.
--
-- Category rows use plan_type = NULL + category_id set. Postgres treats NULL
-- as distinct from NULL under a plain UNIQUE constraint, so these rows never
-- collide with each other or with the 5 fixed-string bucket rows under the
-- original `plans_owner_id_financial_year_month_plan_type_key` constraint —
-- meaning that constraint needs no change at all. A separate partial unique
-- index enforces one row per category per month instead.

alter table plans add column if not exists category_id uuid references categories (id) on delete cascade;
alter table plans alter column plan_type drop not null;

alter table plans drop constraint if exists plans_plan_type_check;
alter table plans add constraint plans_plan_type_check check (
  (plan_type in ('personal_income', 'business_income', 'home_expense', 'office_expense', 'investment') and category_id is null)
  or (plan_type is null and category_id is not null)
);

create unique index if not exists plans_category_unique
  on plans (owner_id, financial_year, month, category_id)
  where category_id is not null;
