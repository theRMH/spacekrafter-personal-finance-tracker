-- 0016_category_codes.sql
-- Short expense-head codes on categories (e.g. "HM-01", "OFF-03"), requested
-- by the client for Settings. System-generated on insert (a category can be
-- created from four different places — Settings, Add Entry, and two inline
-- "+ Add new category" flows on Transactions — so a DB trigger is the single
-- source of truth instead of reimplementing numbering four times), with the
-- Owner able to correct it afterward via the app.

alter table categories add column if not exists code text;

-- Backfill existing rows: prefix by usage, numbered per owner+prefix in
-- creation order.
with prefixed as (
  select id,
    case default_personal_or_office
      when 'personal' then 'HM'
      when 'office' then 'OFF'
      else 'GEN'
    end as prefix,
    row_number() over (
      partition by owner_id, case default_personal_or_office
        when 'personal' then 'HM'
        when 'office' then 'OFF'
        else 'GEN'
      end
      order by created_at
    ) as seq
  from categories
  where code is null
)
update categories c
set code = prefixed.prefix || '-' || lpad(prefixed.seq::text, 2, '0')
from prefixed
where c.id = prefixed.id;

alter table categories drop constraint if exists categories_code_unique;
alter table categories add constraint categories_code_unique unique (owner_id, code);

create or replace function assign_category_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text;
  next_seq int;
begin
  if new.code is not null then
    return new;
  end if;

  prefix := case new.default_personal_or_office
    when 'personal' then 'HM'
    when 'office' then 'OFF'
    else 'GEN'
  end;

  select coalesce(max(substring(code from '\d+$')::int), 0) + 1
    into next_seq
  from categories
  where owner_id = new.owner_id and code like prefix || '-%';

  new.code := prefix || '-' || lpad(next_seq::text, 2, '0');
  return new;
end;
$$;

drop trigger if exists categories_assign_code on categories;
create trigger categories_assign_code
  before insert on categories
  for each row
  execute function assign_category_code();
