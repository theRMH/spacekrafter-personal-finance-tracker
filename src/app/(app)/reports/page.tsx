import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";

const TABS = [
  { value: "overview", label: "Financial Overview" },
  { value: "spend", label: "Spend Intelligence" },
  { value: "counterparty", label: "Payees / Payers" },
  { value: "accounts", label: "Accounts" },
  { value: "commitments", label: "Commitments" },
  { value: "investments", label: "Investments" },
  { value: "operations", label: "Operations" },
];

const DONUT_COLORS = ["#181E32", "#3A71AA", "#56A688", "#CDC1B4", "#767678", "#6C6456"];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Previous period of the same length immediately preceding `from`, for period-over-period deltas.
function prevPeriodRange(from: string, to: string) {
  const fromD = new Date(from);
  const toD = new Date(to);
  const lengthDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (lengthDays - 1));
  return { prevFrom: toIso(prevFrom), prevTo: toIso(prevTo) };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; from?: string; to?: string; usage?: string };
}) {
  const supabase = createClient();
  const tab = searchParams?.tab || "overview";
  const fromDate = searchParams?.from;
  const toDate = searchParams?.to;
  const usageFilter = searchParams?.usage;
  const hasRange = Boolean(fromDate && toDate);

  // Only overview/spend/counterparty use this — skip the round-trip on the other tabs.
  const needsTx = tab === "overview" || tab === "spend" || tab === "counterparty";

  function buildTxQuery() {
    let q = supabase
      .from("transactions")
      .select("amount, type, personal_or_office, payee_payer, transaction_date, status, accounts(name), categories(group_name)")
      .is("deleted_at", null)
      .eq("status", "confirmed");
    if (fromDate) q = q.gte("transaction_date", fromDate);
    if (toDate) q = q.lte("transaction_date", toDate);
    if (usageFilter) q = q.eq("personal_or_office", usageFilter);
    return q;
  }

  let tx: any[] = [];
  let prevTx: any[] = [];
  if (needsTx) {
    if (tab === "overview" && hasRange) {
      const { prevFrom, prevTo } = prevPeriodRange(fromDate!, toDate!);
      let prevQuery = supabase
        .from("transactions")
        .select("amount, type, personal_or_office, transaction_date, status")
        .is("deleted_at", null)
        .eq("status", "confirmed")
        .gte("transaction_date", prevFrom)
        .lte("transaction_date", prevTo);
      if (usageFilter) prevQuery = prevQuery.eq("personal_or_office", usageFilter);
      const [{ data: mainData }, { data: prevData }] = await Promise.all([buildTxQuery(), prevQuery]);
      tx = mainData || [];
      prevTx = prevData || [];
    } else {
      const { data } = await buildTxQuery();
      tx = data || [];
    }
  }

  // Tab links and the filter form both need to preserve whichever of these are active.
  function hrefForTab(tabValue: string) {
    const params = new URLSearchParams();
    params.set("tab", tabValue);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (usageFilter) params.set("usage", usageFilter);
    return `/reports?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Reports and Insights</h1>
          <p className="text-sm text-muted mt-1">Spend, income, accounts, commitments and investments</p>
        </div>
        <a href="/api/export/transactions" className="bg-white border border-[#e3ddd7] rounded-xl px-4 py-2.5 text-sm font-semibold text-navy">
          Export transactions (CSV)
        </a>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <Link key={t.value} href={hrefForTab(t.value)} className={`rounded-full px-3 py-2 text-xs border ${tab === t.value ? "bg-navy text-white border-navy" : "bg-white border-[#e3ddd7] text-navy"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {needsTx && (
        <form method="get" className="flex flex-wrap items-end gap-2 mb-6 bg-white border border-[#e3ddd7] rounded-xl p-3">
          <input type="hidden" name="tab" value={tab} />
          <div>
            <label className="block text-[10px] text-muted mb-1">From</label>
            <input type="date" name="from" defaultValue={fromDate} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-1">To</label>
            <input type="date" name="to" defaultValue={toDate} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-1">Usage</label>
            <select name="usage" defaultValue={usageFilter || ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
              <option value="">All</option>
              <option value="personal">Personal</option>
              <option value="office">Office</option>
              <option value="shared">Shared</option>
            </select>
          </div>
          <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">
            Apply
          </button>
          {(fromDate || toDate || usageFilter) && (
            <Link href={`/reports?tab=${tab}`} className="text-[11px] text-muted underline px-1">
              Clear filters
            </Link>
          )}
        </form>
      )}

      {tab === "overview" && <OverviewTab tx={tx} prevTx={prevTx} hasRange={hasRange} />}
      {tab === "spend" && <SpendTab tx={tx} />}
      {tab === "counterparty" && <CounterpartyTab tx={tx} />}
      {tab === "accounts" && <AccountsTab supabase={supabase} />}
      {tab === "commitments" && <CommitmentsTab supabase={supabase} />}
      {tab === "investments" && <InvestmentsTab supabase={supabase} />}
      {tab === "operations" && <OperationsTab supabase={supabase} />}
    </div>
  );
}

function sumBy(tx: any[], type: string, usage?: string) {
  return tx.filter((t) => t.type === type && (!usage || t.personal_or_office === usage)).reduce((s, t) => s + Number(t.amount), 0);
}

function OverviewTab({ tx, prevTx, hasRange }: { tx: any[]; prevTx: any[]; hasRange: boolean }) {
  const income = sumBy(tx, "income");
  const expense = sumBy(tx, "expense");
  const personalSpend = sumBy(tx, "expense", "personal");
  const officeSpend = sumBy(tx, "expense", "office");

  const prevIncome = sumBy(prevTx, "income");
  const prevExpense = sumBy(prevTx, "expense");
  const prevPersonalSpend = sumBy(prevTx, "expense", "personal");
  const prevOfficeSpend = sumBy(prevTx, "expense", "office");

  function delta(current: number, previous: number) {
    if (!hasRange) return null;
    if (previous === 0) return current === 0 ? null : "New";
    const pct = ((current - previous) / previous) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs previous period`;
  }

  const cards = [
    { label: "Total income", value: income, delta: delta(income, prevIncome) },
    { label: "Total expenses", value: expense, delta: delta(expense, prevExpense) },
    { label: "Net cash flow", value: income - expense, delta: delta(income - expense, prevIncome - prevExpense) },
    { label: "Personal spend", value: personalSpend, delta: delta(personalSpend, prevPersonalSpend) },
    { label: "Office spend", value: officeSpend, delta: delta(officeSpend, prevOfficeSpend) },
  ];

  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">{c.label}</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(c.value)}</div>
          {c.delta && (
            <div className={`text-[10px] mt-1 font-semibold ${c.delta.startsWith("+") || c.delta === "New" ? "text-success" : c.delta.startsWith("-") ? "text-[#b64b52]" : "text-muted"}`}>
              {c.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SpendTab({ tx }: { tx: any[] }) {
  const expenses = tx.filter((t) => t.type === "expense");
  const byCategory = new Map<string, number>();
  for (const t of expenses) {
    const key = t.categories?.group_name || "Uncategorised";
    byCategory.set(key, (byCategory.get(key) || 0) + Number(t.amount));
  }
  const rows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const total = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const avgDaily = total / 30;

  const highestExpense = expenses.reduce((max: any, t) => (!max || Number(t.amount) > Number(max.amount) ? t : max), null);

  const byDay = new Map<string, number>();
  for (const t of expenses) {
    byDay.set(t.transaction_date, (byDay.get(t.transaction_date) || 0) + Number(t.amount));
  }
  const highestDay = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0];

  const chartRows = rows.slice(0, 8);
  const maxCat = Math.max(1, ...chartRows.map(([, amt]) => amt));
  const barChartH = chartRows.length * 28 + 10;

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">Total spend</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(total)}</div>
        </div>
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">Average daily spend (30d basis)</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(avgDaily)}</div>
        </div>
        <Link href={highestExpense?.payee_payer ? `/transactions?payee=${encodeURIComponent(highestExpense.payee_payer)}` : "/transactions"} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4 block hover:shadow-md transition-shadow">
          <div className="text-[11px] text-muted">Highest single expense</div>
          <div className="text-lg font-extrabold text-navy mt-1">{highestExpense ? formatInr(highestExpense.amount) : "-"}</div>
          <div className="text-[10px] text-muted mt-1">{highestExpense?.payee_payer || "No expenses yet"}</div>
        </Link>
        <Link href={highestDay ? `/transactions?from=${highestDay[0]}&to=${highestDay[0]}` : "/transactions"} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4 block hover:shadow-md transition-shadow">
          <div className="text-[11px] text-muted">Highest spend day</div>
          <div className="text-lg font-extrabold text-navy mt-1">{highestDay ? formatInr(highestDay[1]) : "-"}</div>
          <div className="text-[10px] text-muted mt-1">{highestDay ? formatDate(highestDay[0]) : "No expenses yet"}</div>
        </Link>
      </div>

      {chartRows.length > 0 && (
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4 mb-6">
          <h3 className="text-sm font-bold text-navy mb-3">Spend by category</h3>
          <svg viewBox={`0 0 640 ${barChartH}`} width="100%" height={barChartH}>
            {chartRows.map(([cat, amt], i) => {
              const barW = (amt / maxCat) * 480;
              const y = i * 28;
              return (
                <g key={cat}>
                  <text x="0" y={y + 14} className="text-[10px]" fill="#767678">{cat}</text>
                  <rect x="130" y={y + 4} width={Math.max(2, barW)} height="16" rx="3" fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  <text x={130 + barW + 8} y={y + 16} className="text-[10px] font-bold" fill="#181E32">{formatInr(amt)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
        <table className="w-full text-xs">
          <thead><tr className="bg-[#faf9f7] text-muted uppercase text-[10px]"><th className="text-left p-3">Category</th><th className="text-right p-3">Amount</th><th className="text-right p-3">% of spend</th></tr></thead>
          <tbody>
            {rows.map(([cat, amt]) => (
              <tr key={cat} className="border-t border-[#edf0ee]">
                <td className="p-3">{cat}</td>
                <td className="p-3 text-right font-bold">{formatInr(amt)}</td>
                <td className="p-3 text-right">{total ? `${((amt / total) * 100).toFixed(0)}%` : "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted">No expenses yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CounterpartyTab({ tx }: { tx: any[] }) {
  const byPayee = new Map<string, { amount: number; count: number }>();
  for (const t of tx.filter((t) => t.type === "expense" && t.payee_payer)) {
    const key = t.payee_payer as string;
    const cur = byPayee.get(key) || { amount: 0, count: 0 };
    byPayee.set(key, { amount: cur.amount + Number(t.amount), count: cur.count + 1 });
  }
  const rows = Array.from(byPayee.entries()).sort((a, b) => b[1].amount - a[1].amount).slice(0, 20);

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
      <table className="w-full text-xs">
        <thead><tr className="bg-[#faf9f7] text-muted uppercase text-[10px]"><th className="text-left p-3">Payee</th><th className="text-right p-3">Payments</th><th className="text-right p-3">Total</th></tr></thead>
        <tbody>
          {rows.map(([payee, d]) => (
            <tr key={payee} className="border-t border-[#edf0ee]">
              <td className="p-3">{payee}</td>
              <td className="p-3 text-right">{d.count}</td>
              <td className="p-3 text-right font-bold">{formatInr(d.amount)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted">No payee data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

async function AccountsTab({ supabase }: { supabase: any }) {
  const [{ data: accounts }, { data: allTx }] = await Promise.all([
    supabase.from("accounts").select("id, name, opening_balance, statement_closing_balance, reconciliation_status, last_imported_at"),
    supabase.from("transactions").select("account_id, amount, type").eq("status", "confirmed").is("deleted_at", null),
  ]);

  const movement = new Map<string, number>();
  for (const t of allTx || []) {
    const signed = t.type === "income" ? Number(t.amount) : -Number(t.amount);
    movement.set(t.account_id, (movement.get(t.account_id) || 0) + signed);
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
      <table className="w-full text-xs min-w-[760px]">
        <thead><tr className="bg-[#faf9f7] text-muted uppercase text-[10px]"><th className="text-left p-3">Account</th><th className="text-right p-3">Opening</th><th className="text-right p-3">Calculated</th><th className="text-right p-3">Statement closing</th><th className="text-right p-3">Difference</th><th className="text-left p-3">Status</th></tr></thead>
        <tbody>
          {(accounts || []).map((a: any) => {
            const calculated = Number(a.opening_balance) + (movement.get(a.id) || 0);
            const diff = a.statement_closing_balance != null ? calculated - Number(a.statement_closing_balance) : null;
            return (
              <tr key={a.id} className="border-t border-[#edf0ee]">
                <td className="p-3 font-semibold">{a.name}</td>
                <td className="p-3 text-right">{formatInr(a.opening_balance)}</td>
                <td className="p-3 text-right">{formatInr(calculated)}</td>
                <td className="p-3 text-right">{a.statement_closing_balance != null ? formatInr(a.statement_closing_balance) : "-"}</td>
                <td className="p-3 text-right">{diff != null ? formatInr(diff) : "-"}</td>
                <td className="p-3 capitalize">{a.reconciliation_status.replace("_", " ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function CommitmentsTab({ supabase }: { supabase: any }) {
  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, name, commitment_type, expected_amount, due_date, status")
    .neq("status", "cancelled")
    .order("due_date");

  const groups = ["insurance", "utility", "subscription", "emi", "sip", "expected_income", "other"];

  return (
    <div className="grid gap-6">
      {groups.map((g) => {
        const items = (commitments || []).filter((c: any) => c.commitment_type === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <h3 className="text-xs font-bold text-navy uppercase mb-2">{g.replace("_", " ")}</h3>
            <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
              <table className="w-full text-xs">
                <tbody>
                  {items.map((c: any) => (
                    <tr key={c.id} className="border-t border-[#edf0ee] first:border-t-0">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{formatDate(c.due_date)}</td>
                      <td className="p-3 text-right">{c.expected_amount ? formatInr(c.expected_amount) : "-"}</td>
                      <td className="p-3 capitalize">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function InvestmentsTab({ supabase }: { supabase: any }) {
  const { data: investments } = await supabase.from("investments").select("investment_type, invested_amount, current_value");
  const byType = new Map<string, { invested: number; current: number }>();
  for (const i of investments || []) {
    const cur = byType.get(i.investment_type) || { invested: 0, current: 0 };
    byType.set(i.investment_type, {
      invested: cur.invested + Number(i.invested_amount || 0),
      current: cur.current + Number(i.current_value || i.invested_amount || 0),
    });
  }
  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
      <table className="w-full text-xs">
        <thead><tr className="bg-[#faf9f7] text-muted uppercase text-[10px]"><th className="text-left p-3">Type</th><th className="text-right p-3">Invested</th><th className="text-right p-3">Current value</th><th className="text-right p-3">Gain / Loss</th></tr></thead>
        <tbody>
          {Array.from(byType.entries()).map(([type, d]) => {
            const gain = d.current - d.invested;
            const gainPct = d.invested ? (gain / d.invested) * 100 : 0;
            const gainColor = gain > 0 ? "text-success" : gain < 0 ? "text-[#b64b52]" : "text-muted";
            return (
              <tr key={type} className="border-t border-[#edf0ee]">
                <td className="p-3 capitalize">{type.replace(/_/g, " ")}</td>
                <td className="p-3 text-right">{formatInr(d.invested)}</td>
                <td className="p-3 text-right">{formatInr(d.current)}</td>
                <td className={`p-3 text-right font-bold ${gainColor}`}>
                  {d.invested ? `${gain >= 0 ? "+" : ""}${formatInr(gain)} (${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%)` : "-"}
                </td>
              </tr>
            );
          })}
          {(!investments || investments.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-muted">No investments yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

async function OperationsTab({ supabase }: { supabase: any }) {
  const [{ count: needsReview }, { data: batches }, { data: auditLog }] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "needs_review").is("deleted_at", null),
    supabase.from("import_batches").select("id, file_name, created_at, accepted, unknown").order("created_at", { ascending: false }).limit(10),
    supabase.from("audit_log").select("id, action, entity_table, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="grid gap-6">
      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4 max-w-xs">
        <div className="text-[11px] text-muted">Transactions needing review</div>
        <div className="text-lg font-extrabold text-navy mt-1">{needsReview || 0}</div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-navy uppercase mb-2">Recent imports</h3>
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
          <table className="w-full text-xs">
            <tbody>
              {(batches || []).map((b: any) => (
                <tr key={b.id} className="border-t border-[#edf0ee] first:border-t-0">
                  <td className="p-3">{formatDate(b.created_at)}</td>
                  <td className="p-3">{b.file_name}</td>
                  <td className="p-3 text-right">{b.accepted} accepted</td>
                  <td className="p-3 text-right">{b.unknown} needs review</td>
                </tr>
              ))}
              {(!batches || batches.length === 0) && <tr><td className="p-6 text-center text-muted">No imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-navy uppercase mb-2">Recent audit events</h3>
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
          <table className="w-full text-xs">
            <tbody>
              {(auditLog || []).map((a: any) => (
                <tr key={a.id} className="border-t border-[#edf0ee] first:border-t-0">
                  <td className="p-3">{formatDate(a.created_at)}</td>
                  <td className="p-3">{a.action}</td>
                  <td className="p-3">{a.entity_table}</td>
                </tr>
              ))}
              {(!auditLog || auditLog.length === 0) && <tr><td className="p-6 text-center text-muted">No audit events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
