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

export default async function ReportsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient();
  const tab = searchParams?.tab || "overview";

  const { data: allTx } = await supabase
    .from("transactions")
    .select("amount, type, personal_or_office, payee_payer, transaction_date, status, accounts(name), categories(group_name)")
    .is("deleted_at", null)
    .eq("status", "confirmed");

  const tx = allTx || [];

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

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <Link key={t.value} href={`/reports?tab=${t.value}`} className={`rounded-full px-3 py-2 text-xs border ${tab === t.value ? "bg-navy text-white border-navy" : "bg-white border-[#e3ddd7] text-navy"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "overview" && <OverviewTab tx={tx} />}
      {tab === "spend" && <SpendTab tx={tx} />}
      {tab === "counterparty" && <CounterpartyTab tx={tx} />}
      {tab === "accounts" && <AccountsTab supabase={supabase} />}
      {tab === "commitments" && <CommitmentsTab supabase={supabase} />}
      {tab === "investments" && <InvestmentsTab supabase={supabase} />}
      {tab === "operations" && <OperationsTab supabase={supabase} />}
    </div>
  );
}

function OverviewTab({ tx }: { tx: any[] }) {
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const personalSpend = tx.filter((t) => t.type === "expense" && t.personal_or_office === "personal").reduce((s, t) => s + Number(t.amount), 0);
  const officeSpend = tx.filter((t) => t.type === "expense" && t.personal_or_office === "office").reduce((s, t) => s + Number(t.amount), 0);

  const cards = [
    { label: "Total income", value: income },
    { label: "Total expenses", value: expense },
    { label: "Net cash flow", value: income - expense },
    { label: "Personal spend", value: personalSpend },
    { label: "Office spend", value: officeSpend },
  ];

  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">{c.label}</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(c.value)}</div>
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

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6 max-w-lg">
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">Total spend</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(total)}</div>
        </div>
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <div className="text-[11px] text-muted">Average daily spend (30d basis)</div>
          <div className="text-lg font-extrabold text-navy mt-1">{formatInr(avgDaily)}</div>
        </div>
      </div>
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
  const { data: accounts } = await supabase.from("accounts").select("id, name, opening_balance, statement_closing_balance, reconciliation_status, last_imported_at");
  const { data: allTx } = await supabase.from("transactions").select("account_id, amount, type").eq("status", "confirmed").is("deleted_at", null);

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
        <thead><tr className="bg-[#faf9f7] text-muted uppercase text-[10px]"><th className="text-left p-3">Type</th><th className="text-right p-3">Invested</th><th className="text-right p-3">Current value</th></tr></thead>
        <tbody>
          {Array.from(byType.entries()).map(([type, d]) => (
            <tr key={type} className="border-t border-[#edf0ee]">
              <td className="p-3 capitalize">{type.replace(/_/g, " ")}</td>
              <td className="p-3 text-right">{formatInr(d.invested)}</td>
              <td className="p-3 text-right">{formatInr(d.current)}</td>
            </tr>
          ))}
          {(!investments || investments.length === 0) && <tr><td colSpan={3} className="p-6 text-center text-muted">No investments yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

async function OperationsTab({ supabase }: { supabase: any }) {
  const { count: needsReview } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "needs_review").is("deleted_at", null);
  const { data: batches } = await supabase.from("import_batches").select("id, file_name, created_at, accepted, unknown").order("created_at", { ascending: false }).limit(10);
  const { data: auditLog } = await supabase.from("audit_log").select("id, action, entity_table, created_at").order("created_at", { ascending: false }).limit(10);

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
