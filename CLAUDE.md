# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First.

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.


## 4. Push to GitHub
Do not push to GitHub without confirmation.

---

## 5. Never Remove UI Rows or Sections

**This is a client-delivered mock project. The UI structure is intentional.**

- Do NOT delete rows, sections, tabs, cards, or fields from any page.
- The client has approved the UI layout. Our job is to connect real data to it — not redesign it.
- If a row has hardcoded/mock data and no real data source exists yet: show $0 (or an empty state), add a `(not tracked)` badge, and create the data source (migration + table) so real data can be entered.
- The only thing we remove is the hardcoded number — the row itself stays.

**Right approach when a field has no real data:**
1. Show $0 or `—` instead of the mock value
2. Add a badge: `Not tracked yet` or `Add via [page]`
3. Create the DB table/column so real data can flow in later
4. Never invent a formula or estimate to fill it unless explicitly asked

Wrong: deleting the "Tech & Infrastructure" row because there's no data for it.
Right: showing $0 with a "Not tracked" badge and creating an `operating_expenses` table.

---

## 5. Log Every Change to CHANGES.md

**After every session, update `CHANGES.md`.**

This project has multiple developers. The changelog is the coordination layer — it tells every developer what changed, what needs to be deployed, and why.

### What to log
Every time you modify, add, or delete a file:
- Source files (`src/**`) — what file, what changed, one line
- Migrations (`supabase/migrations/*.sql`) — what the migration does, mark with `⚠ DEPLOY`
- Edge functions (`supabase/functions/**`) — what changed, mark with `⚠ DEPLOY`
- Config files (`vercel.json`, `package.json`, `CLAUDE.md`, etc.)

### Format
Add a new block at the **top** of `CHANGES.md` under today's date:

```markdown
## YYYY-MM-DD

### Short description of what changed
**Commit:** `abc1234` (or "Uncommitted")
- **Added:** `src/path/file.tsx` — what it does
- **Changed:** `src/path/file.ts` — what changed and why
- **Added:** `supabase/migrations/YYYYMMDD_name.sql` — what it does ⚠ DEPLOY
- **Changed:** `supabase/functions/fn-name/` — what changed ⚠ DEPLOY
```

### The `⚠ DEPLOY` rule
Any migration or edge function that has been added or modified but not yet deployed to Supabase must be marked `⚠ DEPLOY`. This is the signal for the person who manages the Supabase dashboard to apply it. Do not assume it was deployed just because it was committed.

### When to write it
- At the end of the session, before or after the commit
- If a session spans multiple features, write one block per feature
- Do not batch-update at the end of multiple sessions — write it while context is fresh

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes, and no developer is surprised by what's in the codebase or what needs deploying.
