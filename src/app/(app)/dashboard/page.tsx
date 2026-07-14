import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountMovements } from "@/lib/balances";
import { formatInr, formatDate } from "@/lib/format";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const DONUT_COLORS = ["#181E32", "#3A71AA", "#56A688", "#CDC1B4", "#767678", "#6C6456"];

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };
  const firstName = (profile?.full_name || "Owner").split(" ")[0];

  const { data: accounts } = await supabase.from("accounts").select("id, opening_balance, active");
  const movementByAccount = await getAccountMovements(supabase);

  const activeAccountIds = new Set((accounts || []).filter((a) => a.active).map((a) => a.id));
  const openingByAccount = new Map((accounts || []).map((a) => [a.id, Number(a.opening_balance)]));

  let totalBalance = 0;
  for (const id of activeAccountIds) {
    totalBalance += (openingByAccount.get(id) || 0) + (movementByAccount.get(id) || 0);
  }

  // Last 6 months of confirmed transactions for the trend chart + current-month breakdowns.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const { data: rangeTx } = await supabase
    .from("transactions")
    .select("amount, type, personal_or_office, payee_payer, transaction_date, categories(group_name)")
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .gte("transaction_date", sixMonthsAgo.toISOString().slice(0, 10));

  const allTx = rangeTx || [];
  const monthStart = startOfMonth(new Date());
  const thisMonthTx = allTx.filter((t) => new Date(t.transaction_date) >= monthStart);

  const income = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netCashFlow = income - expense;
  const personalExpense = thisMonthTx.filter((t) => t.type === "expense" && t.personal_or_office === "personal").reduce((s, t) => s + Number(t.amount), 0);
  const officeExpense = thisMonthTx.filter((t) => t.type === "expense" && t.personal_or_office === "office").reduce((s, t) => s + Number(t.amount), 0);

  const cards = [
    { label: "Total available balance", value: formatInr(totalBalance), sub: `Across ${activeAccountIds.size} active account(s)`, href: "/accounts" },
    { label: "Income this month", value: formatInr(income), sub: "Confirmed transactions", href: "/transactions" },
    { label: "Expense this month", value: formatInr(expense), sub: expense > 0 ? `Personal ${Math.round((personalExpense / expense) * 100)}% | Office ${Math.round((officeExpense / expense) * 100)}%` : "No expenses yet", href: "/transactions" },
    { label: "Net cash flow", value: formatInr(netCashFlow), sub: netCashFlow >= 0 ? "Positive this month" : "Negative this month", href: "/reports" },
  ];

  // 6-month trend
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }) });
  }
  const trend = months.map((m) => {
    const [y, mo] = m.key.split("-").map(Number);
    const monthTx = allTx.filter((t) => {
      const d = new Date(t.transaction_date);
      return d.getFullYear() === y && d.getMonth() === mo;
    });
    return {
      label: m.label,
      income: monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });
  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.income, t.expense)));
  const chartW = 640, chartH = 200, padL = 10, padR = 10;
  const stepX = (chartW - padL - padR) / (trend.length - 1 || 1);
  const toY = (v: number) => chartH - 20 - (v / maxTrend) * (chartH - 40);
  const incomePoints = trend.map((t, i) => `${padL + i * stepX},${toY(t.income)}`).join(" ");
  const expensePoints = trend.map((t, i) => `${padL + i * stepX},${toY(t.expense)}`).join(" ");

  // Spend split donut (this month, by category)
  const expenseTx = thisMonthTx.filter((t) => t.type === "expense");
  const byCategory = new Map<string, number>();
  for (const t of expenseTx) {
    const key = (t as any).categories?.group_name || "Uncategorised";
    byCategory.set(key, (byCategory.get(key) || 0) + Number(t.amount));
  }
  const spendRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const spendTotal = spendRows.reduce((s, [, v]) => s + v, 0) || 1;
  let cursor = 0;
  const gradientParts = spendRows.map(([, v], i) => {
    const start = (cursor / spendTotal) * 100;
    cursor += v;
    const end = (cursor / spendTotal) * 100;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${end}%`;
  });
  const donutGradient = gradientParts.length ? `conic-gradient(${gradientParts.join(",")})` : "conic-gradient(#eef2ef 0% 100%)";

  // Top payees this month
  const byPayee = new Map<string, { amount: number; count: number }>();
  for (const t of expenseTx.filter((t) => t.payee_payer)) {
    const key = t.payee_payer as string;
    const cur = byPayee.get(key) || { amount: 0, count: 0 };
    byPayee.set(key, { amount: cur.amount + Number(t.amount), count: cur.count + 1 });
  }
  const topPayees = Array.from(byPayee.entries()).sort((a, b) => b[1].amount - a[1].amount).slice(0, 3);

  // Upcoming commitments (30 days)
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const { data: upcoming } = await supabase
    .from("commitments")
    .select("id, name, due_date, expected_amount")
    .in("status", ["upcoming", "due", "overdue"])
    .lte("due_date", thirtyDaysOut.toISOString().slice(0, 10))
    .order("due_date")
    .limit(3);

  const { count: needsReviewCount } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "needs_review").is("deleted_at", null);
  const { count: provisionalCount } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "provisional").is("deleted_at", null);
  const { count: pendingApprovals } = await supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending");

  const attention = [
    { label: "Uncategorised / needs review", sub: "Imported rows", count: needsReviewCount || 0, style: "warn", href: "/transactions?status=needs_review" },
    { label: "Provisional", sub: "Pending statement match", count: provisionalCount || 0, style: "info", href: "/transactions?status=provisional" },
    { label: "Approvals", sub: "Payment requests", count: pendingApprovals || 0, style: "danger", href: "/approvals" },
  ];
  const pillStyle: Record<string, string> = {
    warn: "bg-[#fff0dc] text-[#a9793b]",
    danger: "bg-[#fdeaea] text-[#b64b52]",
    info: "bg-[#e8eff8] text-info",
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}</h1>
          <p className="text-sm text-muted mt-1">Your complete financial position at a glance</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/reports" className="bg-white border border-[#e3ddd7] rounded-xl px-4 py-2.5 text-sm font-semibold text-navy">View reports</Link>
          <Link href="/add-entry" className="bg-navy text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Add entry</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5 block hover:shadow-md transition-shadow">
            <div className="text-[11px] uppercase tracking-wide text-muted">{c.label}</div>
            <div className="text-[26px] font-extrabold text-navy mt-2.5">{c.value}</div>
            <div className="text-[11px] text-muted mt-2">{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-4 mt-4">
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-sm font-bold text-navy">Income and expense trend</h3>
              <span className="text-[11px] text-muted">Last 6 months</span>
            </div>
            <div className="flex gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-navy inline-block" />Income</span>
              <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-success inline-block" />Expense</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-[200px]">
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1={padL} y1={chartH - 20 - f * (chartH - 40)} x2={chartW - padR} y2={chartH - 20 - f * (chartH - 40)} stroke="#edf0ee" />
            ))}
            <polyline fill="none" stroke="#181E32" strokeWidth="3" points={incomePoints} />
            <polyline fill="none" stroke="#56A688" strokeWidth="3" points={expensePoints} />
            {trend.map((t, i) => (
              <text key={t.label} x={padL + i * stepX} y={chartH - 4} fontSize="10" fill="#767678" textAnchor="middle">{t.label}</text>
            ))}
          </svg>
        </div>

        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-navy">Spend split</h3>
            <span className="text-[11px] text-muted">This month</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="relative w-[150px] h-[150px] rounded-full mx-auto" style={{ background: donutGradient }}>
              <div className="absolute inset-[26px] bg-white rounded-full grid place-items-center text-center">
                <div>
                  <b className="text-base">{formatInr(spendTotal === 1 && spendRows.length === 0 ? 0 : spendTotal)}</b>
                  <div className="text-[9px] text-muted">Total spend</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {spendRows.map(([cat, amt], i) => (
                <div key={cat} className="flex justify-between items-center text-[11px]">
                  <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full inline-block" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />{cat}</span>
                  <b>{formatInr(amt)}</b>
                </div>
              ))}
              {spendRows.length === 0 && <p className="text-[11px] text-muted">No expenses yet this month.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-navy">Upcoming commitments</h3>
            <span className="text-[11px] text-muted">Next 30 days</span>
          </div>
          {(upcoming || []).map((c) => (
            <div key={c.id} className="flex justify-between items-center py-2.5 border-b border-[#edf0ee] last:border-0">
              <div>
                <b className="block text-xs">{c.name}</b>
                <span className="text-[11px] text-muted">{formatDate(c.due_date)}</span>
              </div>
              <strong className="text-xs">{c.expected_amount ? formatInr(c.expected_amount) : "-"}</strong>
            </div>
          ))}
          {(!upcoming || upcoming.length === 0) && <p className="text-[11px] text-muted py-2">Nothing due in the next 30 days.</p>}
        </div>

        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-navy">Top payees</h3>
            <span className="text-[11px] text-muted">This month</span>
          </div>
          {topPayees.map(([payee, d]) => (
            <div key={payee} className="flex justify-between items-center py-2.5 border-b border-[#edf0ee] last:border-0">
              <div>
                <b className="block text-xs">{payee}</b>
                <span className="text-[11px] text-muted">{d.count} payment(s)</span>
              </div>
              <strong className="text-xs">{formatInr(d.amount)}</strong>
            </div>
          ))}
          {topPayees.length === 0 && <p className="text-[11px] text-muted py-2">No payee data yet this month.</p>}
        </div>

        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-navy">Attention required</h3>
            <span className="text-[11px] text-muted">{attention.reduce((s, a) => s + a.count, 0)} items</span>
          </div>
          {attention.map((a) => (
            <Link key={a.label} href={a.href} className="flex justify-between items-center py-2.5 border-b border-[#edf0ee] last:border-0">
              <div>
                <b className="block text-xs">{a.label}</b>
                <span className="text-[11px] text-muted">{a.sub}</span>
              </div>
              <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${pillStyle[a.style]}`}>{a.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
