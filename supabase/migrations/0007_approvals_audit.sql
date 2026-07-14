-- 0007_approvals_audit.sql
-- Approval workflow (Accountant deletion/correction requests -- empty
-- until the Accountant role milestone) and a generic audit log.

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null references auth.users (id),
  request_type text not null check (request_type in ('deletion', 'correction', 'payment')),
  target_table text not null,
  target_id uuid not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'correction_requested', 'completed')),
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table approval_requests enable row level security;
drop policy if exists "approval_requests_owner_all" on approval_requests;
create policy "approval_requests_owner_all" on approval_requests
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;
drop policy if exists "audit_log_owner_all" on audit_log;
create policy "audit_log_owner_all" on audit_log
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists audit_log_owner_created_idx on audit_log (owner_id, created_at desc);
