# Changes

Per-session changelog for this project. See `CLAUDE.md` for the logging format and the `⚠ DEPLOY` rule.

## 2026-07-22 (continued, edit action for Insurance/Utilities/Subscriptions)

### Added the same Edit action to Insurance, Utilities, and Subscriptions
**Commit:** Uncommitted
- **Context:** Follow-up to the Income Sources edit fix — confirmed the same missing-edit gap existed on all three sibling commitment-type pages (create + mark-paid only, no way to update details afterward).
- **Added:** `updateInsurancePolicy` (`insurance/actions.ts`) + `policy-row.tsx`, `updateUtilityConnection` (`utilities/actions.ts`) + `connection-row.tsx`, `updateSubscription` (`subscriptions/actions.ts`) + `subscription-row.tsx` — each mirrors the Income Sources pattern: an "Edit" link expands an inline form pre-filled with current values, Save/Cancel. Subscriptions' row keeps its existing Cancel/Restart logic alongside the new Edit button, unchanged.
- **Changed:** all three `page.tsx` files now delegate row rendering to their new client row component instead of a static server-rendered `<tr>`.
- **Verified:** rebuilt clean; Playwright edited a real record on each page (LIC Life Cover premium, Home Electricity amount, Netflix amount), confirmed each change persisted directly in the database, then reverted all three back to their original demo values (non-destructive test, consistent with this session's cleanup discipline). Also confirmed Subscriptions' Cancel/Restart/Mark paid conditional logic still renders correctly alongside Edit. Zero real console errors (one benign dev-mode HMR fetch warning, same artifact seen earlier this session, unrelated to this change).

**⚠ Redeploy needed:** frontend-only, no migrations.

## 2026-07-22 (continued, income source edit)

### Income Sources: added a real Edit action
**Commit:** Uncommitted
- **Context:** User noticed the 5 real income sources (created with ₹0 placeholder amounts) had no way to actually enter real figures — only "Mark received" existed, no edit. Checked: Insurance/Utilities/Subscriptions have the exact same gap (create + mark-paid only, no edit anywhere) — this was a systemic gap in the pattern I copied, not unique to Income Sources.
- **Added:** `updateIncomeSource` action (`income-sources/actions.ts`) and `income-source-row.tsx` — each row now has an "Edit" link that expands an inline form (same fields as Add) pre-filled with current values; Save/Cancel. `page.tsx` now delegates row rendering to this client component instead of a static server-rendered `<tr>`.
- **Verified:** rebuilt clean; Playwright confirmed the Edit form opens pre-filled and Save persists — confirmed directly in the database (`expected_amount` updated from 0 to 25000 on Kodambakkam Flat Rent, which is now real data, not a test value to clean up).
- **Not done yet:** the same missing-edit gap on Insurance/Utilities/Subscriptions — flagged to the user, not yet actioned.

**⚠ Redeploy needed:** frontend-only, no migrations.

## 2026-07-22 (continued, pinned nav items)

### Sidebar: pin any nav item to the top
**Commit:** Uncommitted
- **Context:** Follow-up to collapsible groups. User wanted lightweight menu customization — explicitly not Quick Access (automatic "most used" tracking, still deferred) — just letting them manually pin specific items so they're always visible without opening a collapsed group.
- **Changed:** `src/app/(app)/app-shell.tsx` — a pin toggle (📌) next to every nav item; pinned items appear in a new "Pinned" section above the collapsible groups (same `localStorage`-backed pattern as the collapsed-group state, key `navPinnedPaths`). Pinning is a shortcut, not a move — the item still also appears in its normal group. The Pinned section only renders when something is actually pinned.
- **Verified:** rebuilt clean; Playwright confirmed no Pinned section when nothing's pinned, pinning shows the item in both places, the pin survives a reload, unpinning removes the section once empty, and group collapsing still works unaffected. Zero console errors.

**⚠ Redeploy needed:** frontend-only, no migrations.

## 2026-07-22 (continued)

### Category list: added the one real gap found during an Excel re-audit
**Commit:** Uncommitted
- **Context:** User asked for a full re-check that the app matches the Excel gap analysis. Re-verified directly against the live database rather than from memory — found one genuine miss: Excel had "Meat Expenses" as its own line item, but it wasn't split out from general Groceries when the other food-related items were (Fresh Produce & Dairy was, Meat wasn't — inconsistent, not intentional).
- **Added:** "Meat / Non-Veg" subcategory under "Home - Groceries and Food" — `scripts/seed-owner.mjs` (future owners) and `scripts/expand-categories.mjs` (applied to the live owner via `npm run expand:categories`). ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum`.
- **Confirmed, not changed:** the deliberately-generalized categories (no per-person names like "Banu Expenses" or "LIC Premium - Seetharaman") already have a working self-service path — Settings → Categories already has full create/delete CRUD (built in the earlier categorisation round) — so the Owner can add his own specific categories himself without needing code changes.
- **Added:** `scripts/add-excel-income-sources.mjs` — created the 5 real recurring income sources from the client's Excel that don't already have a category-level home: Kodambakkam Flat Rent, Bangalore Flat Rent, Lavanya's two payout streams, KitchenAid AMC. (Excel's other income lines — business sales, salary, freelance — are already covered as regular income categories.) Amounts left at ₹0 (the Excel had them scrubbed too — no figures invented), due date defaulted to the 1st of next month as a placeholder. Nirmal edits both from the Income Sources page whenever he has real numbers; he can also add more sources himself there anytime.

## 2026-07-22

### Sidebar: collapsible nav groups
**Commit:** Uncommitted
- **Context:** Sidebar had grown to 16 nav items across 3 groups (Overview/Personal Finance/Control) as features were added this session; user said it looked "stuffed." Asked for two things (a Quick Access "most used" section, and collapsible groups) — chose to defer Quick Access (needs its own tracking-mechanism decision, discussed but not resolved) and do collapsible groups now.
- **Changed:** `src/app/(app)/app-shell.tsx` — each of the 3 group headers is now a clickable toggle with a chevron; collapsing a group hides its items (other groups unaffected). State persists per-browser via `localStorage` (`navCollapsedGroups`) so it's remembered across sessions without a backend change — this is a personal UI preference, not financial data, same category as which forms are expanded. Defaults to all-expanded (nothing changes until a user actively collapses something). Works unchanged for the Accountant's already-filtered nav.
- **Verified:** rebuilt clean; Playwright confirmed collapsing one group hides only that group's items, other groups stay visible, the collapsed state survives a page reload, and expanding again restores the items. Zero console errors.
- **Deferred:** Quick Access ("most used at top") and any menu customization (reorder/hide/add shortcuts) — discussed, both need their own design decisions (tracking mechanism: browser-local vs. synced to account) and were explicitly deferred to design together later rather than half-building either now.

**⚠ Redeploy needed:** frontend-only, no migrations.

## 2026-07-21 (continued)

### Accountant role v1 — invite flow, RLS-enforced scoping, role-aware nav and middleware
**Commit:** Uncommitted
- **Context:** Long-disabled "Invite Accountant" button on Users & Access. The PRD/IA docs (project root) already spec this in full detail (tab/action/account/data permission layers, invite flow, approval-gated deletion, multiple accountants, session revocation). Scoped down to a v1 slice, confirmed with the user: invite with owner-set temp password (no email/SMTP), fixed default tab set (no owner-customizable per-accountant scope yet), View/Add/Import only (no edit/delete), enforced at the RLS layer — not just a hidden nav menu, per the PRD's explicit "server-side enforcement" requirement.
- **Added:** `supabase/migrations/0011_accountant_role.sql` — `profiles.managed_owner_id` (which Owner an Accountant works for) + purely additive RLS policies granting an Accountant SELECT on accounts/categories/subcategories/category_rules, SELECT+INSERT on transactions/import_batches/audit_log, INSERT+UPDATE on import_batches (needed so the Owner sees correct summary counts for imports an Accountant runs), and full access on import_mappings (their own saved column-mapping preference). None of the existing Owner-only policies were touched. ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum` via `npm run migrate`.
- **Verified the RLS boundary directly** (via a real signed-in test accountant, before writing any UI): can SELECT accounts/categories, can INSERT a transaction, **cannot** UPDATE or DELETE it, and sees **zero rows** from investments/plans/commitments — confirmed as actual query results, not just intent.
- **Added:** `src/lib/supabase/admin.ts` — service-role client, used only server-side for user creation.
- **Added:** `src/lib/auth.ts` — `getEffectiveOwnerId()`. Every write path in the app previously hardcoded `owner_id: user.id` (the currently authenticated user) — fine for a single-owner app, but would have made an Accountant's own inserts owned by *their* uid instead of the Owner's. Wired into `add-entry/actions.ts` (`createTransaction`) and `import/actions.ts` (`processImport`, all 4 insert/upsert points) so records an Accountant creates still belong to the Owner's account; `audit_log.actor_id` still records the literal Accountant for accountability.
- **Added:** `src/app/(app)/users-access/actions.ts` (`inviteAccountant`) + rewrote `page.tsx` — real user directory (Owner + their accountants, with email resolved via the admin client) and a working "+ Invite Accountant" form (name/email/temp password), replacing the disabled button. Blocks non-owners from inviting.
- **Changed:** `src/lib/nav.ts` — `ACCOUNTANT_ALLOWED_PATHS`/`navForRole()` as the single source of truth for both nav filtering and route gating (Accounts, Import Statements, Add Entry, Transactions, Profile — Transactions added beyond the PRD's literal default list since Add Entry redirects there after saving, and it's a natural read-only view of data the Accountant can already SELECT). `src/app/(app)/layout.tsx`/`app-shell.tsx` thread role through; sidebar footer now shows "accountant access" / "owner access" instead of a hardcoded label.
- **Changed:** `src/middleware.ts` — fetches the caller's role and redirects an Accountant away from any path outside their allowed set (403 for `/api/*`, redirect to `/accounts` otherwise), including on direct URL visits — the PRD is explicit that hidden menus alone aren't sufficient. Login redirect target is now role-aware (Accountant → `/accounts`, Owner → `/dashboard`). Note: this adds one more Supabase round trip per navigation (role lookup) — a real, deliberate latency cost for genuine access control, not the kind of redundant call removed earlier this session.
- **Verified end-to-end** with a real invited accountant, signed in for real: appears in the Owner's user directory; lands on `/accounts` not `/dashboard`; nav shows exactly Accounts/Add Entry/Import Statements/Transactions and hides Dashboard/Investments/Reports/Settings/Users & Access; direct URL visits to blocked routes redirect away; successfully added a transaction via Add Entry; **that transaction's `owner_id` correctly matches the real Owner, not the accountant** (confirmed directly in the database). Zero console errors. Test accountant and test transaction cleaned up afterward.

**Deferred to a later round (per agreed v1 scope):** Owner customizing which additional tabs/accounts a specific Accountant can see, forced password change on first login, session revocation UI, approval-gated deletion workflow, support for differently-scoped multiple accountants.

**⚠ Redeploy needed:** migration already applied directly to Supabase (not part of the Vercel build); the frontend/middleware changes need the normal `git push` → Vercel redeploy.

## 2026-07-21

### Plans and Projections: per-category and per-income-source Projected vs Actual vs Variance
**Commit:** Uncommitted
- **Context:** Third and last of the Excel gap-analysis findings. The Excel's core mechanic — Projected/Actual/Variance/Variance% per individual line item per month — was only implemented at 5 coarse monthly buckets on the existing Plans page. Confirmed with the user: category-level granularity (not subcategory, too tedious to fill monthly), the existing 5-bucket summary stays as-is, income sources get their own row too.
- **Added:** `supabase/migrations/0010_plan_categories.sql` — adds `category_id` to `plans`, relaxes `plan_type` to nullable so category rows (`plan_type = null`, `category_id` set) coexist with the 5 legacy bucket rows without touching the original unique constraint or `savePlans`'s existing upsert. A separate partial unique index (`category_id is not null`) enforces one row per category per month. ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum` via `npm run migrate`.
- **Added:** `src/app/(app)/plans/actions.ts` — `saveCategoryPlans`, a manual check-then-insert/update per category (not a DB upsert, since matching a partial unique index via Supabase's `onConflict` isn't reliable).
- **Changed:** `src/app/(app)/plans/page.tsx` — below the unchanged 5-bucket summary, added a **Category breakdown** table (all ~30 categories, editable Projected input per row, Actual grouped from confirmed transactions by `category_id`, Variance/Variance%) and an **Income sources** table (one row per named income source, Projected from its `expected_amount`, Actual summed from confirmed transactions linked via `linked_commitment_id`). All categories/sources shown even at ₹0 — nothing hidden.
- **Added:** Add Entry can now link an income transaction to a named income source — `add-entry/page.tsx` fetches `expected_income` commitments, `entry-form.tsx` shows an optional "Income source" dropdown when Type = Income, `actions.ts` stores it on `transactions.linked_commitment_id` (column already existed, just wasn't set from this path before). Without this, income-source Actuals would only ever populate via bank-statement Import, not how income is typically logged day-to-day.
- **Verified:** rebuilt clean; migration applied without touching existing bucket rows; Playwright confirmed the 5-bucket summary is unchanged, the category table renders and a saved projection persists correctly (confirmed directly in the database — `plan_type: null`, `category_id` set, `projected_amount` correct), and an income source's Actual correctly reflects a manually-entered transaction linked to it via the new Add Entry dropdown once confirmed. Zero console errors. All test data (income source, transaction, category plan row) cleaned up afterward.

**⚠ Redeploy needed:** migration already applied directly to Supabase (not part of the Vercel build); the frontend changes need the normal `git push` → Vercel redeploy.

## 2026-07-20 (continued, real bank statement test)

### Import: verified end-to-end against a real bank statement
**Commit:** N/A — no code changed, verification only
- **Context:** Pending backlog item "actual run-through with bank statement." User provided a real statement (`test file for nirmal app.xlsx`, 202 real transaction rows with the amount columns deliberately stripped for privacy). Filled in synthetic debit/credit amounts (summed to match the statement's own real footer totals for internal consistency) and ran it through Import against the HDFC Personal account.
- **Result:** 202 rows accepted, 0 rejected, 0 duplicates, 0 transfers, 0 commitment matches, 15 auto-confirmed via existing category rules/payee history (e.g. every SWIGGY narration correctly categorized to Home - Groceries and Food, salary credits correctly identified as income), 187 correctly routed to Needs review as genuinely novel payees. Zero console errors. Import took over a minute for 202 rows — consistent with the per-request Supabase latency characteristic found earlier this session, not a bug.
- **Cleanup:** all 202 test transactions, the import_batches row, and the audit_log entry were deleted afterward since the amounts were synthetic. The real statement file and a derived CSV both contained real third-party personal data (names, UPI handles) — the generated CSV and helper scripts were deleted; the original uploaded file was left for the user to decide on.
- **Verdict:** Import feature works correctly against real-world messy bank narrations, not just the clean seed/dummy data used previously.

## 2026-07-20 (continued)

### Named income sources — new "Income Sources" page
**Commit:** Uncommitted
- **Context:** Second slice of the Excel gap analysis. The `commitments` table already allowed `commitment_type = 'expected_income'` but nothing ever created one — dead schema placeholder. Built out the same way Insurance/Utilities/Subscriptions already work: shared `commitments` row + a 1:1 detail extension table.
- **Added:** `supabase/migrations/0009_income_sources.sql` — `income_source_details` table (`income_type`, `payer_or_property`, `notes`), RLS scoped to the owner via the parent commitment, same pattern as `insurance_details`/`utility_details`/`subscription_details`. ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum` via `npm run migrate`.
- **Added:** `src/app/(app)/income-sources/page.tsx`, `add-income-source-form.tsx` (collapsible, same pattern as Insurance's), `actions.ts` (`createIncomeSource`, `markIncomeReceived`) — full CRUD-lite for named recurring income (e.g. "Kodambakkam Flat Rent", "Lavanya Portfolio Payout"), with an Income type dropdown (Rental / Salary / Business Revenue / Investment Payout / Service-AMC Revenue / Other), expected amount, frequency, next expected date, linked account, and free-text payer/property + notes.
- **Added:** `src/lib/nav.ts` — new "Income Sources" entry in the Personal Finance group, before Insurance.
- **Changed:** the `paid` commitment status displays as **"Received"** on this page specifically (not "Paid") — same display-only relabeling pattern used earlier for provisional → "Unverified" on Transactions; underlying DB value unchanged so Calendar/Reports/Dashboard read paths (which already handle `expected_income` generically) need no changes.
- **Verified:** rebuilt clean; Playwright confirmed the nav entry, empty state, collapsible form open/collapse-after-submit, a created income source appears and its status correctly reads "Received" (confirmed via row HTML) after Mark received, and Reports' Commitments tab (which already grouped by `commitment_type` generically) picks up the new type with zero code changes needed there. Zero console errors. Test record cleaned up from the database afterward.

**⚠ Redeploy needed:** migration already applied directly to Supabase (not part of the Vercel build); the frontend/nav changes need the normal `git push` → Vercel redeploy.

## 2026-07-20

### Richer category list, Settings subcategory delete, and a category-default-usage bug fix
**Commit:** Uncommitted
- **Context:** Client's real cash-flow Excel (`NirmalKumar_CashFlow_Jun26_Mar27.xlsx`, pasted into project root) was reviewed in full to find gaps vs. the app. Three sized gaps were found (richer categories, named income sources, per-line-item projected/actual variance); this round covers only the smallest — the other two are deferred (see notes below).
- **Changed:** `scripts/seed-owner.mjs` (`CATEGORY_SEED`) — added ~12 new subcategories across existing groups plus one new group ("Home - Religious and Family"), generalized (not the client's literal Excel names, per discussion): Fresh Produce and Dairy, Drinking Water, Driver Salary, Tuition / Coaching Fees, Supplements / Protein, Pet Care, Movies and Outings, Laundry Expenses, Religious / Temple Expenses, Family Functions and Events, Property Purchase - Legal and Documentation, Investment Returns / Payouts. Nothing existing removed or renamed. Applies to any future new owner from day one.
- **Added:** `scripts/expand-categories.mjs` — idempotent script (upsert on the same unique keys as the seed script) to apply the same additions to the already-provisioned live owner, since `seed-owner.mjs` can't be safely re-run (it also creates the auth user). Added as `npm run expand:categories`. Ran against the live Supabase project — confirmed via direct query afterward: 20 categories (was 19), 103 subcategories (was ~78 + 25 across two rounds of additions/corrections), zero duplicates on a second run.
- **Fixed:** `categories.default_personal_or_office` was settable in Settings but never actually applied anywhere — `add-entry/page.tsx` didn't even select that column. Now `add-entry/entry-form.tsx` auto-fills the Personal/Office/Shared field from the selected category's default, but only until the owner manually touches that field themselves (tracked via a `usageTouched` flag) — fully overridable, just removes a redundant click for the common case.
- **Added:** `deleteSubcategory` action (`settings/actions.ts`) + a `×` control per subcategory row (`settings/page.tsx`) — subcategories could previously be created but never removed. Mirrors `deleteCategory`'s existing guard (blocked if any transaction references it via `subcategory_id`).
- **Verified:** rebuilt clean; ran the expansion script twice against the live project to confirm idempotency (identical output, zero duplicate rows); Playwright confirmed the new group/subcategories render in Settings, deleting an unused subcategory works, Add Entry's usage field auto-fills from a category's default and preserves a manual override across further category changes. Zero console errors. (One test-script mistake during manual guard-testing briefly deleted the original "Groceries and Vegetables" subcategory since it happened to have no transactions referencing its `subcategory_id` specifically, even though its parent category is heavily used — restored immediately via direct upsert; final state confirmed correct.)
- **Deferred (per decision, not started):** named recurring income sources, and per-line-item Projected vs Actual vs Variance (the Excel's central mechanic — app's `/plans` page only does this at 5 coarse buckets today). Full gap-analysis findings kept in memory (`excel_gap_analysis.md`) for when this is revisited.

**⚠ Redeploy needed:** frontend change (Add Entry, Settings) needs the normal `git push` → Vercel redeploy. The category data changes are **already applied directly to the live Supabase project** via `npm run expand:categories` — not part of the Vercel build, no further action needed for that part.

## 2026-07-15

### Financial Calendar: clickable days + Reports/Insights date filtering and deeper insights
**Commit:** Uncommitted
- **Added:** `src/app/(app)/calendar/calendar-view.tsx` — extracted the month grid + agenda into a client component so day cells can be interactive. Clicking a day switches the existing Agenda panel (no new modal) from "upcoming" to "everything due that day" (unlike the month cell's 3-item truncation, the day list shows all items — scales to 4-5+ per day), with a "← Back to agenda" control to return. Each item links to its managing page via a `commitment_type → route` map (insurance → `/insurance`, utility → `/utilities`, subscription → `/subscriptions`); types with no dedicated page today (emi/sip/expected_income/other) render as plain text instead of a dead link.
- **Changed:** `src/app/(app)/calendar/page.tsx` — trimmed to the server-side data fetch + summary cards + month nav + type filters; month grid/agenda JSX moved into `CalendarView`.
- **Changed:** `src/app/(app)/reports/page.tsx` — Overview, Spend Intelligence, and Payees/Payers tabs (the ones built on the `transactions` query) now have a date-range + Usage (Personal/Office/Shared) filter bar, same GET-form pattern as Transactions. Accounts/Commitments/Investments/Operations tabs intentionally stay unfiltered — they're snapshots, not period flows.
- **Added:** Overview KPI cards show a "+N% vs previous period" delta (income, expenses, net cash flow, personal/office spend) when a date range is active, comparing against the immediately preceding period of the same length.
- **Added:** Spend Intelligence now surfaces the single highest expense (amount + payee, links to Transactions filtered by that payee) and the highest-spend calendar day (links to Transactions for that date), plus a horizontal SVG bar chart of spend by category (top 8, same palette as the Dashboard charts, no new dependency).
- **Added:** Investments tab has a Gain/Loss column (₹ and %) per investment type, alongside the existing Invested/Current value columns.
- **Verified:** rebuilt clean; Playwright confirmed clicking a day with a commitment (8 Jul → Home Electricity) switches the agenda panel, clicking the item navigates to `/utilities`, an empty day shows "Nothing due on this day", and "Back to agenda" returns to the default list; confirmed the Reports filter bar narrows Overview/Spend/Investments data, the previous-period delta renders, Spend Intelligence shows the highest-expense/highest-day cards and bar chart, the Investments Gain/Loss column renders, and the Accounts tab (unfiltered) has no filter form. Zero console errors.

**⚠ Redeploy needed:** frontend-only, no migrations.

### Perf: removed redundant Supabase Auth round trip on every page load
**Commit:** Uncommitted
- **Changed:** `src/middleware.ts` — after verifying the session (unavoidable, security-critical), forwards the user's id/email to downstream Server Components via request headers (`x-user-id`, `x-user-email`) instead of leaving them to re-derive it themselves.
- **Changed:** `src/app/(app)/layout.tsx`, `dashboard/page.tsx`, `profile/page.tsx`, `users-access/page.tsx` — each was calling `supabase.auth.getUser()` a second time (redundant with middleware) as a blocking step *before* its own data-fetching `Promise.all`, adding a fully sequential extra round trip to Supabase Auth on every single navigation. Now they read the id/email middleware already forwards and fold the profile fetch into the existing parallel batch.
- **Investigated but did not change:** the user reported the local dev server feeling slow across most pages. Measured it directly — a raw connectivity test straight to Supabase (bypassing the app) showed 100–500ms per round trip from this dev machine to the Tokyo-region project, and every navigation needs at least one such round trip for the mandatory auth check plus one for page data, which is an inherent cost of developing locally against a geographically distant database, not a code bug. Timing before/after this fix was statistically unchanged (~1.3s/navigation both ways over multiple trials) — the fix is worth keeping (fewer redundant requests, real if modest win, no downside) but it is not a fix for the perceived slowness. Production is expected to not have this problem since Vercel is already colocated with Supabase in the same Tokyo region (see 2026-07-14 performance entry) — local dev has no equivalent colocation available.
- **Verified:** rebuilt clean; Playwright confirmed unauthenticated access still redirects to `/login`, authenticated access to `/login` still redirects to `/dashboard`, sign-out still works, and name/email/initials still render correctly on Dashboard, Profile, Users & Access, and the topbar. Zero console errors.

**⚠ Redeploy needed:** frontend-only, no migrations.

## 2026-07-14

### Collapsible Add forms (Insurance/Utilities/Subscriptions/Investments), Subscription Restart, per-tab Investment forms, notification bell
**Commit:** Uncommitted
- **Added:** `add-policy-form.tsx`, `add-connection-form.tsx`, `add-subscription-form.tsx` — same collapsible pattern as Accounts (minimized by default, expands on click, auto-collapses after successful submit) applied to Insurance, Utilities, and Subscriptions.
- **Added:** Subscriptions **Restart** action — cancelled subscriptions now show a date picker + Restart button instead of just sitting cancelled forever. New `restartSubscription` server action sets `status = 'upcoming'` and `due_date` to the owner-chosen date. Verified end-to-end on the user's own cancelled Netflix subscription — now shows "upcoming," restart date 1 Aug 2026, and correctly appears in Dashboard's "Upcoming commitments" (left in this restarted state as a working demo, not reverted).
- **Fixed:** Add Investment form — reported bug where selecting any type (e.g. PPF/NPS, Gold/Bonds) still showed Mutual Fund and Share-specific fields regardless. Went with the fuller fix over the minimal one (discussed with user): Investments now has **4 dedicated form components** instead of 1 do-everything form — `add-mutual-fund-form.tsx` and `add-share-form.tsx` for their respective tabs (no type dropdown needed, it's implied by the tab), `add-simple-investment-form.tsx` reused across FD/RD, PPF/NPS, Gold/Bonds, Real Estate, Business Capital, and Other (common fields only, no extra fieldset — none of those types have type-specific fields in the schema), and `add-investment-form.tsx` as Overview's catch-all with a dropdown that now dynamically shows only the matching fieldset. Shared base fields factored into `investment-common-fields.tsx` to avoid duplicating them across all 4. `investments/page.tsx` routes to the right form based on the active tab.
- **Added:** real notification bell — the topbar's ◉ icon (previously a plain link to Approvals with no content, originally designed as a notifications bell in the prototype but never wired up) now shows a badge (today's due commitments + pending approvals) and a dropdown listing them, "Nothing due today" when empty, closes on outside click. `layout.tsx` fetches commitments due today in the same parallel `Promise.all` as the existing user/approvals queries; `app-shell.tsx` and `topbar.tsx` thread it through. Deliberately did **not** add a new icon — reused existing UI real estate per discussion (validated the idea first: a new icon would have been the 4th place showing due-date info, alongside Dashboard's upcoming-commitments card, attention card, and the Calendar itself).
- **Verified:** rebuilt clean; Playwright confirmed all 3 collapsible forms create real records (checked directly in the database, since same-page revalidation timing made DOM-based checks unreliable — not a bug, a test-script artifact); confirmed all 9 Investments tabs render the correct dedicated form (no MF/Share field bleed on the 6 simple tabs, dropdown-driven fields correct on Overview); confirmed the notification bell badge, dropdown content, and outside-click-to-close. Zero console errors throughout. Test records cleaned up from the database afterward (except the Netflix restart, kept intentionally as noted above).

**⚠ Redeploy needed:** frontend-only, no migrations.

### Accounts: collapsible "Add account" card + "Other" account type
**Commit:** Uncommitted
- **Added:** `supabase/migrations/0008_account_type_other.sql` — extends the `accounts.type` check constraint to allow `'other'` alongside bank/credit_card/upi_wallet/cash/loan. ⚠ DEPLOY status: **already applied** to Supabase project `trwmwickjvkoexotymum` via `npm run migrate`.
- **Added:** `src/app/(app)/accounts/add-account-form.tsx` — the "Add account" form is now a collapsible client component: minimized by default (a compact "+ Add account" bar), expands on click, and auto-collapses again after a successful submit. Replaces the always-open form that used to take a full card's worth of space regardless of whether you were adding an account.
- **Changed:** `src/app/(app)/accounts/page.tsx` — inline form removed in favor of `<AddAccountForm />`; added "Other" to the account type badge lookup so existing accounts of that type display correctly.
- **Design note:** the account `type` field isn't free text because it drives real logic (only `cash` accounts skip the Unverified/provisional status in Add Entry) — so rather than an arbitrary custom-type text field, "Other" is a 6th preset that behaves like any other non-cash account, and the form has a hint pointing owners to describe what it actually is in the free-text Account name field.
- **Verified:** rebuilt clean; Playwright confirmed the form starts collapsed (0 form fields rendered), expands correctly, the Type dropdown lists all 6 options including "Other", an Other-type account was created successfully and appeared in the account list, and the form auto-collapsed after submit. Test account deleted afterward. Zero console errors.

**⚠ Redeploy needed:** migration already applied directly to Supabase (not part of the Vercel build); the frontend change needs the normal `git push` → Vercel redeploy.

### Transactions: full filter bar (Account/Usage/Type/Category/Payee) + date-range picker + "Unverified" rename
**Commit:** Uncommitted
- **Changed:** `src/app/(app)/transactions/page.tsx` — added a date-range picker (From/To), and Account, Usage (Personal/Office/Shared), Type (Income/Expense/Transfer/Investment), Category, and Payee/Payer (free-text search) filters, all combining with the existing status tabs. Status tabs now preserve every active filter when switching between them (extended `hrefForStatus()` beyond just date range).
- **Renamed:** "Provisional" → "Unverified" everywhere it's user-facing (Transactions filter tab, per-row status badge via a new `STATUS_LABEL` map, Dashboard's attention card, Import page copy) — the internal DB status value stays `provisional`, only the display label changed, per user feedback that "provisional" reads as accounting jargon.
- **Bug caught during verification:** the "Clear filters" link initially reused the same `hrefForStatus()` helper built for the status tabs (which *preserves* active filters) — so clicking it did nothing. Fixed to actually clear all filters while still sensibly preserving the active status tab if one was selected (e.g. `?status=confirmed` survives; date/account/usage/type/category/payee don't).
- **Verified:** rebuilt clean; Playwright confirmed each filter narrows results correctly (Type=expense → 52/71 rows, +Usage=office → 17; Account=ICICI Office → 21 rows all from that account; Category=Groceries → 11 rows; Payee search "Zoho" → 6 exact matches), status-tab switching preserves all active filters, and the fixed Clear filters link resets to a clean URL (or `?status=X` if a tab was active). Zero console errors throughout.

**⚠ Redeploy needed:** frontend-only, no migrations.

### Dashboard: interactive trend chart + unambiguous period labels
**Commit:** Uncommitted
- **Added:** `src/app/(app)/dashboard/trend-chart.tsx` — client component replacing the static inline SVG. Adds hover (desktop) and tap (mobile) interactivity: a wide invisible hit-target per month, highlighted dots + a guideline on the active point, and a floating tooltip showing the exact month/income/expense values. Same data, same visual style — purely additive.
- **Fixed:** the chart's SVG had `touch-none` (CSS `touch-action: none`), which suppresses the browser's synthetic click-after-tap on real touch devices — this would have silently broken the whole feature on phones. Removed it and added an explicit `onTouchStart` handler as well.
- **Changed:** `src/app/(app)/dashboard/page.tsx` — every period-scoped card/section subtitle now shows an explicit date range (e.g. "1–15 Jul 2026") instead of vague text like "Confirmed transactions" or "This month", per user feedback that it wasn't clear whether values were lifetime, weekly, or monthly. "Total available balance" is labeled "As of {today}" since a balance is a snapshot, not a period.
- **Decision (discussed with user, not built this round):** a real interactive Today/Week/Month/Last Month/Custom period selector (PRD DASH-02) will go on the **Reports** page instead of Dashboard — a dashboard should stay a fast, fixed "right now" view; flexible filtering belongs on the Analysis/Reports side. Follow-up, not part of this change.
- **Verified:** rebuilt clean; Playwright checks confirm tooltip values exactly match the KPI cards' totals (e.g. July tooltip = ₹1,25,320 income / ₹21,247 expense, identical to the Income/Expense cards), zero console errors, zero horizontal overflow on a 390px mobile viewport, and the interaction works via click (confirmed) — Playwright's synthetic `.tap()` doesn't generate a click by design (it's meant to test raw touch handlers in isolation), so it undercounts real mobile behavior; real phones fire click-after-tap once `touch-action: none` isn't blocking it, which was the actual fix.

**⚠ Redeploy needed:** frontend-only, no migrations — push to `main` for Vercel to redeploy.

### Performance: colocate Vercel with Supabase's region + parallelize queries
**Commit:** Uncommitted
- **Added:** `vercel.json` — pins serverless functions to `hnd1` (Tokyo), matching the Supabase project's `ap-northeast-1` region. Diagnosis: with no region set, Vercel defaults to a US region, so every Supabase call on every page was making a full Pacific round-trip. This is the single biggest lever — it doesn't reduce in local dev testing (this machine isn't in either region), so its effect will only show once redeployed to Vercel.
- **Changed:** `src/app/(app)/dashboard/page.tsx` — 8 sequential `await supabase...` calls collapsed into one `Promise.all` (plus the one unavoidable `getUser()` that a later query depends on). Also deleted a duplicate "upcoming commitments" query block that was left over from an earlier edit.
- **Changed:** `src/app/(app)/reports/page.tsx` — the page-level transaction query now only runs for the 3 tabs that actually use it (`overview`/`spend`/`counterparty`), skipping a wasted round-trip on the other 4 tabs; `AccountsTab` and `OperationsTab` each had 2-3 sequential queries parallelized.
- **Changed:** `src/app/(app)/investments/page.tsx`, `import/page.tsx`, `transactions/page.tsx`, `(app)/layout.tsx` — same treatment: independent queries that were `await`-ed one after another now fire together via `Promise.all`. `layout.tsx` matters most since it runs on **every** page load.
- **Verified:** rebuilt clean (`npm run build`), and a Playwright pass across all newly-changed pages (dashboard, all 7 report tabs, transactions, investments, import) showed zero console errors and identical rendered data to before — this was a pure data-fetching reorder, no behavior change.
- **Not done (noted, not a regression):** did not attempt to eliminate the second `auth.getUser()` call that both `middleware.ts` and `layout.tsx` make on every request (middleware validates for the redirect gate, layout re-validates to get the user id for its own queries). Passing the validated user through via a request header would save one more round-trip per navigation, but it's a real auth-flow change with more risk — flagging as a possible follow-up rather than doing it opportunistically here.

**⚠ Redeploy needed:** push to `main` for Vercel to pick up `vercel.json` and redeploy in the Tokyo region — this is where most of the actual speed-up will be felt, not in local testing.

### Full mobile-responsiveness pass
**Commit:** Uncommitted
- **Added:** `src/app/(app)/app-shell.tsx` — client component holding mobile nav-drawer state (open/close, closes on route change, locks body scroll while open). `layout.tsx` now stays server-side for data fetching and delegates rendering to this.
- **Changed:** `src/app/(app)/layout.tsx` — sidebar/topbar/main rendering moved into `AppShell`; layout.tsx now just fetches user/profile/pending-approvals and passes them down.
- **Changed:** `src/app/(app)/topbar.tsx` — added a hamburger button (`md:hidden`) wired to the drawer; profile chip's name text now hides below `sm` (icon-only) so it doesn't crowd the hamburger + icon buttons on narrow screens.
- **Fixed root cause:** the sidebar previously had no mobile behavior at all — `grid md:grid-cols-[268px_1fr]` with no base `grid-cols` meant the full 15-item sidebar just stacked *above* the page content below the `md` breakpoint, forcing a scroll past the entire nav to reach any page. Sidebar is now a proper off-canvas drawer on mobile (fixed position, slide-in/out, backdrop, closes on nav or tap-outside) while staying exactly as before on desktop.
- **Changed:** `src/app/login/page.tsx` — added a compact brand header (logo + "Spacekrafter") visible only on mobile, since the desktop marketing panel is intentionally hidden below `md` and previously left mobile with zero brand identity.
- **Changed:** form grids across `add-entry/entry-form.tsx`, `insurance/page.tsx`, `utilities/page.tsx`, `subscriptions/page.tsx`, `investments/page.tsx` (incl. Mutual Fund/Share fieldsets), `plans/page.tsx`, `accounts/page.tsx`, `settings/page.tsx` — every fixed `grid-cols-2`/`grid-cols-3` used for form fields now starts single-column and expands at `sm:`, so phone-width forms don't cram into unreadable columns.
- **Changed:** `dashboard/page.tsx` — spend-split donut layout (`grid-cols-[150px_1fr]`) now stacks (donut above, legend below) below `sm`; page-header button rows across dashboard/plans/accounts/reports/transactions now `flex-wrap` instead of squeezing on narrow screens.
- **Changed:** `calendar/page.tsx` — day-cell min-height and padding scale down below `sm`, event-name text hides on the smallest screens (leaving just the colour dot) so a week of the month grid doesn't force excessive scrolling on a phone.
- **Fixed:** `settings/page.tsx` — two "add" forms (new category, new subcategory) used a non-wrapping `flex` row; on mobile the `<select>`/`<input>` combined min-content width overflowed the viewport by ~147px, stretching the whole page horizontally. Added `flex-wrap` + `min-w-[140px]` — confirmed down to 1px (rounding) overflow.
- **Added:** `scripts/verify-mobile.mjs` — Playwright pass at a 390×844 (phone-sized) viewport across all 16 pages, measuring `document.documentElement.scrollWidth` vs viewport width per page (catches horizontal overflow), plus a drawer open/close/close-on-navigate check. All 16 pages confirmed at 0px (or ~0px) overflow after fixes. Re-checked desktop viewport afterward — no regression.
- **Kept as-is (by design, not a bug):** dense data tables (Transactions, Reports, Import history, etc.) still scroll horizontally within their own card wrapper on narrow screens rather than reflowing into stacked cards — a standard, acceptable mobile pattern for this kind of dense financial data; verified the scroll stays contained to each table and never forces the whole page to scroll sideways.

**⚠ Redeploy needed:** these are all frontend-only changes (no migrations) — push to `main` and Vercel will redeploy automatically.

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
