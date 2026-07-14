# Changes

Per-session changelog for this project. See `CLAUDE.md` for the logging format and the `⚠ DEPLOY` rule.

## 2026-07-14

### App renamed to Spacekrafter Personal Finance Tracker
**Commit:** Uncommitted
- **Changed:** `package.json` (`name`), `src/app/layout.tsx` (page title metadata), `src/app/(app)/layout.tsx` (sidebar brand block + brandmark), `src/app/login/page.tsx` (login screen brand block + brandmark) — renamed from "Personal Finance Hub" to "Spacekrafter" / "Personal Finance Tracker", brandmark initials `PF` → `SP`.

### UI rework to match approved UI prototype v1.1 + dummy data for visual proof
**Commit:** Uncommitted
- **Added:** `src/lib/nav.ts` — sidebar nav moved out of `layout.tsx` into its own module (Next.js route files can't export arbitrary named exports; this also fixed a `npm run build` type error).
- **Changed:** `src/app/(app)/layout.tsx` — sidebar rebuilt to match the approved prototype's exact grouping: **Overview** (Dashboard, Transactions, Accounts, Import Statements, Add Entry), **Personal Finance** (Insurance, Utilities, Subscriptions, Investments, Plans and Projections, Financial Calendar), **Control** (Approvals with live pending-count badge, Reports and Insights, Users & Access, Settings) — replacing the earlier 11-group IA-literal layout, which didn't match the client-approved UI. Added matching icon glyphs per nav item.
- **Added:** `src/app/(app)/topbar.tsx` — persistent topbar (breadcrumb, calendar/approvals icon buttons, profile chip) matching the prototype, missing from the previous build entirely.
- **Added:** `src/app/(app)/profile/page.tsx` + `actions.ts` — dedicated Profile page (AUTH-02/AUTH-03): edit name, change password (re-verifies current password before allowing change). Previously only Users & Access existed; the topbar/sidebar profile chip now has somewhere real to go.
- **Changed:** `src/app/login/page.tsx` — replaced the prototype's leftover dark-green gradient (`#1d3229 → #3b6b57`) with a navy gradient (`sidebar → navy` + subtle teal/blue glow accents). The green violated the approved palette's own written rule (IA §10 / PRD §12.1: "Dominant colour #181E32... Green must not be used as the dominant theme") — treated as a bug in one screen of the static mockup rather than something to replicate.
- **Changed:** `src/app/(app)/dashboard/page.tsx` — rebuilt to match the prototype's actual layout: added a 6-month income/expense trend chart (SVG polylines, real data), a spend-split donut (CSS conic-gradient, real category breakdown), Top Payees and Upcoming Commitments cards, and restyled Attention Required as bordered rows with status pills — all computed from real Supabase data, not hardcoded.
- **Added:** `scripts/seed-demo-data.mjs` (`npm run seed:demo`) — inserts 60 realistic transactions across the 5 months prior to the current one (salary, client income, rent, groceries, fuel, staff payroll, software, SIP contribution, etc.) so the trend chart and spend breakdown have enough history to be visually meaningful. This is synthetic demo data through the same real schema/tables the app uses — not fake UI numbers — explicitly requested by the user to visually prove functionality before switching to real data entry.
- **Added:** `scripts/screenshot-ui.mjs` — quick Playwright screenshot/console-error check reused for this kind of visual verification pass.

**Note for next session:** current DB now carries demo data (2 accounts, ~71 transactions, 3 paid commitments, 1 investment) generated purely for visual verification. Per the user's plan ("once approved, we can build with real data"), this should be wiped before real usage — flagging here so it isn't mistaken for real financial history later.

### Full Phase-1 webapp build: all 15 IA/PRD tabs, Owner-only, functional end-to-end
**Commit:** Uncommitted
- **Added:** `supabase/migrations/0002_transactions_accounts_extend.sql` — extends `transactions` (type: `+investment`; status: `+provisional`/`needs_review`; adds `fingerprint`, `transfer_pair_id`, `deleted_at`, `import_batch_id`, `linked_commitment_id`; fixes `source` check to allow `imported`) and `accounts` (`statement_closing_balance`, `last_imported_at`, `reconciliation_status`). ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum` via `npm run migrate`.
- **Added:** `supabase/migrations/0003_import_and_rules.sql` — `import_batches`, `import_mappings`, `category_rules`. **Applied.**
- **Added:** `supabase/migrations/0004_commitments.sql` — `commitments` (shared shape) + `insurance_details`/`utility_details`/`subscription_details`. **Applied.**
- **Added:** `supabase/migrations/0005_investments.sql` — `investments` (shared shape) + `mutual_fund_details`/`share_details`. **Applied.**
- **Added:** `supabase/migrations/0006_plans.sql` — `plans` (monthly Owner projections). **Applied.**
- **Added:** `supabase/migrations/0007_approvals_audit.sql` — `approval_requests`, `audit_log`. **Applied.**
- **Added:** `src/lib/format.ts`, `src/lib/balances.ts`, `src/lib/commitments.ts` — shared formatting, calculated-balance (confirmed-only, ACC-03/BR-14), and commitment status-display helpers, reused across pages.
- **Changed:** `src/app/(app)/add-entry/actions.ts` — bank/card/UPI manual entries now save as `provisional` (ENTRY-04/BR-07); cash stays `confirmed` immediately (ENTRY-05).
- **Changed:** `src/app/(app)/transactions/page.tsx` + new `actions.ts` — status badges, status filters, inline categorize-and-confirm for `needs_review` rows, confirm-provisional action, soft-delete.
- **Changed:** `src/app/(app)/dashboard/page.tsx` — attention cards (needs review / provisional / commitments due), confirmed-only totals, drill-down links.
- **Changed:** `src/app/(app)/layout.tsx` — full 15-tab grouped navigation matching IA v1.1 §3.
- **Added:** `src/app/(app)/insurance/`, `utilities/`, `subscriptions/` — commitments CRUD + type-specific detail forms, status badges (upcoming/due/overdue/paid), mark-paid actions.
- **Added:** `src/app/(app)/investments/` — Overview + 8 subtabs (Mutual Funds, Shares, FD/RD, PPF/NPS, Gold/Bonds, Real Estate, Business Capital, Other), manual current-value updates (INV-03).
- **Added:** `src/app/(app)/plans/` — monthly Projected vs Actual vs Variance by plan type, actual computed live from confirmed transactions.
- **Added:** `src/app/(app)/calendar/` — month grid + agenda + summary cards (due this week/30 days/overdue/expected income), sourced from `commitments`.
- **Added:** `src/app/(app)/reports/` — 7 report tabs (Financial Overview, Spend Intelligence, Payees/Payers, Accounts, Commitments, Investments, Operations) with drill-down; `src/app/api/export/transactions/route.ts` CSV export.
- **Added:** `src/app/(app)/approvals/` — Owner-facing approval queue (empty state until Accountant role exists).
- **Added:** `src/app/(app)/users-access/` — directory (Owner only); Accountant invite intentionally disabled with an explanation (no permission-matrix/RLS scoping built yet — see below).
- **Added:** `src/app/(app)/settings/` + `actions.ts` — Category/Subcategory CRUD (add + used-record-safe delete, MASTER-04), Category Rules management (CAT-01/03), Audit log viewer.
- **Added:** `src/app/(app)/import/` (`page.tsx`, `upload-form.tsx`, `actions.ts`) — the statement import engine: CSV upload (`papaparse`) → column mapping (auto-guessed + saved per account) → exact-fingerprint duplicate blocking → provisional-manual-entry merging (BR-03/BR-07) → cross-account transfer detection → commitment-due matching (auto marks Insurance/Utility/Subscription paid) → `category_rules` + prior-confirmed-narration fallback categorisation → unmatched rows land in Transactions → Needs review. Batch summary + import history table.
- **Added:** `sample-data/dummy_statement.csv` — 10-row dummy statement covering every import path (rule-matched income/expense, provisional merge, 3 commitment matches, 1 cross-account transfer, 2 unknown/needs-review rows). Used for verification since no real bank statements are available yet.
- **Added:** `scripts/verify-full-app.mjs` — Playwright script driving every one of the 15 tabs end-to-end (including the full import demo), screenshots in `scripts/.verify-screens/`. Verified: `npm run build` passes clean, zero browser console errors, import batch tallied exactly as designed (10 total / 10 accepted / 0 duplicates / 1 transfer / 4 matched / 2 needs-review, later reduced to 1 after manual categorisation), all 3 commitments auto-marked paid, dashboard/reports/calendar all reflect real data.

**Scope note — still Owner-only.** Accountant role, per-user tab/action/account permissions, and RLS-based multi-user scoping remain a dedicated future milestone (deferred by explicit user decision this session). Also deferred: transaction splitting into multiple category allocations (TXN-08), file/document attachments (Supabase Storage — form fields show a disabled "coming soon" control per CLAUDE.md's never-remove-UI-rows rule rather than being deleted), category merge, PDF export, live market-feed valuations, WhatsApp/SMS/push reminders (all already out-of-scope per PRD).

**Known items before production:** same `next`/`postcss` audit advisories as before (Image Optimization/WebSocket/i18n-related, unused here). The import engine's transfer/commitment matching uses simple amount+date-window heuristics (not ML) — accuracy will need tuning once real bank statement formats are supplied.

---

### Draft/test vertical slice: Next.js + Supabase scaffold (Owner-only)
**Commit:** Uncommitted
- **Added:** `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts` — Next.js 14.2.35 (App Router) + TypeScript + Tailwind project scaffold. Tailwind palette tokens (`navy`, `sidebar`, `beige`, `earth`, `muted`, `success`, `info`) match IA v1.1 §10 / PRD v1.1 §12.1 exactly.
- **Added:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` — Supabase Auth session handling (browser + server clients, route-protection middleware redirecting unauthenticated users to `/login`).
- **Added:** `src/app/login/page.tsx` — Owner email/password sign-in (Supabase Auth). No Accountant role, no forgot-password flow yet — deferred.
- **Added:** `src/app/(app)/layout.tsx`, `src/app/(app)/actions.ts` — authenticated shell (sidebar/nav/profile chip loaded from the signed-in user, sign-out action).
- **Added:** `src/app/(app)/accounts/page.tsx` + `actions.ts` — list accounts with calculated balance, create-account form (ACC-01/02 subset).
- **Added:** `src/app/(app)/add-entry/page.tsx`, `entry-form.tsx` + `actions.ts` — manual single transaction entry (ENTRY-01/02 subset; no bulk entry, no attachments, no provisional/pending states yet).
- **Added:** `src/app/(app)/transactions/page.tsx` — list of confirmed manual transactions with account/category joins (TXN-01 subset).
- **Added:** `src/app/(app)/dashboard/page.tsx` — total balance, this-month income/expense/net cash flow, personal-vs-office split, computed from real `transactions` rows (DASH-01/02 subset).
- **Added:** `supabase/migrations/0001_init.sql` — `profiles`, `accounts`, `categories`, `subcategories`, `transactions` tables with owner-scoped Row Level Security. ⚠ DEPLOY status: **already applied** to the connected Supabase project (ref `trwmwickjvkoexotymum`) via `npm run migrate` — nothing further to deploy for this migration.
- **Added:** `scripts/run-migration.mjs`, `scripts/seed-owner.mjs`, `scripts/verify-golden-path.mjs` — migration runner, Owner user/profile/category seeder (seeded from PRD Appendix A), and a Playwright golden-path check (login → create account → add entry → verify transaction + dashboard totals). Verified locally with zero console errors.
- **Added:** `.env.example` — documents required env vars. Real values live only in local `.env.local` (gitignored, never committed).
- **Changed:** `.gitignore` — added Next.js/env/build ignores.

**Scope note:** this is an intentionally narrow vertical slice to prove the Next.js + Supabase + Vercel architecture end-to-end before building the full PRD v1.1 Phase 1 scope. Explicitly deferred: Accountant role & permission matrix, statement import/auto-categorisation engine, duplicate/transfer detection, commitment matching, Insurance/Utilities/Subscriptions/Investments tabs, Plans & Projections, Financial Calendar, Approvals, Reports/exports, Users & Access admin, audit history, Excel migration.

**Known items before production:** `npm audit` still reports 1 moderate + 1 high advisory on `next`/`postcss` (Image Optimization, WebSocket, i18n-related — none of which this app currently uses); revisit before a Next.js major-version upgrade. The Supabase DB password was shared in plaintext chat during setup — recommend rotating it in the Supabase dashboard.
