import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/format";
import { savePlans, saveCategoryPlans } from "./actions";

const PLAN_TYPES = [
  { key: "personal_income", label: "Personal Income", txType: "income", scope: "personal" },
  { key: "business_income", label: "Business Income", txType: "income", scope: "office" },
  { key: "home_expense", label: "Home Expenses", txType: "expense", scope: "personal" },
  { key: "office_expense", label: "Office Expenses", txType: "expense", scope: "office" },
  { key: "investment", label: "Investments", txType: "investment", scope: null },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function PlansPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const supabase = createClient();
  const now = new Date();
  const year = Number(searchParams?.year) || now.getFullYear();
  const month = Number(searchParams?.month) || now.getMonth() + 1;

  const { data: plans } = await supabase
    .from("plans")
    .select("plan_type, category_id, projected_amount")
    .eq("financial_year", year)
    .eq("month", month);

  const projectedByType = Object.fromEntries((plans || []).filter((p) => p.plan_type).map((p) => [p.plan_type, Number(p.projected_amount)]));
  const projectedByCategory = Object.fromEntries((plans || []).filter((p) => p.category_id).map((p) => [p.category_id as string, Number(p.projected_amount)]));

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [{ data: monthTx }, { data: categories }, { data: incomeSources }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, personal_or_office, category_id, linked_commitment_id")
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth),
    supabase.from("categories").select("id, group_name").order("group_name"),
    supabase
      .from("commitments")
      .select("id, name, expected_amount, income_source_details(income_type)")
      .eq("commitment_type", "expected_income")
      .order("name"),
  ]);

  const tx = monthTx || [];

  const actualByCategory = new Map<string, number>();
  for (const t of tx) {
    if (!t.category_id) continue;
    actualByCategory.set(t.category_id, (actualByCategory.get(t.category_id) || 0) + Number(t.amount));
  }

  const categoryRows = (categories || []).map((c) => {
    const projected = projectedByCategory[c.id] || 0;
    const actual = actualByCategory.get(c.id) || 0;
    const variance = actual - projected;
    const variancePct = projected !== 0 ? (variance / projected) * 100 : 0;
    return { id: c.id, label: c.group_name, projected, actual, variance, variancePct };
  });

  const actualByIncomeSource = new Map<string, number>();
  for (const t of tx) {
    if (t.type !== "income" || !t.linked_commitment_id) continue;
    actualByIncomeSource.set(t.linked_commitment_id, (actualByIncomeSource.get(t.linked_commitment_id) || 0) + Number(t.amount));
  }

  const incomeSourceRows = (incomeSources || []).map((s: any) => {
    const projected = Number(s.expected_amount || 0);
    const actual = actualByIncomeSource.get(s.id) || 0;
    const variance = actual - projected;
    const variancePct = projected !== 0 ? (variance / projected) * 100 : 0;
    return { id: s.id, label: s.name, type: s.income_source_details?.income_type, projected, actual, variance, variancePct };
  });

  function actualFor(planType: string) {
    const def = PLAN_TYPES.find((p) => p.key === planType)!;
    return tx
      .filter((t) => t.type === def.txType && (def.scope === null || t.personal_or_office === def.scope))
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  const totals = PLAN_TYPES.map((p) => {
    const projected = projectedByType[p.key] || 0;
    const actual = actualFor(p.key);
    const variance = actual - projected;
    const variancePct = projected !== 0 ? (variance / projected) * 100 : 0;
    return { ...p, projected, actual, variance, variancePct };
  });

  const netCashFlow = totals[0].actual + totals[1].actual - totals[2].actual - totals[3].actual - totals[4].actual;

  const prevLink = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextLink = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Plans and Projections</h1>
          <p className="text-sm text-muted mt-1">Income, home, office and investment plans with actual variance</p>
        </div>
        <div className="flex gap-2 items-center">
          <Link href={`/plans?year=${prevLink.year}&month=${prevLink.month}`} className="border border-[#e3ddd7] rounded-lg px-3 py-2 text-xs bg-white">←</Link>
          <span className="text-sm font-bold text-navy">{MONTH_NAMES[month - 1]} {year}</span>
          <Link href={`/plans?year=${nextLink.year}&month=${nextLink.month}`} className="border border-[#e3ddd7] rounded-lg px-3 py-2 text-xs bg-white">→</Link>
        </div>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5 mb-6 max-w-xs">
        <div className="text-[11px] uppercase tracking-wide text-muted">Net cash flow (actual)</div>
        <div className={`text-2xl font-extrabold mt-2 ${netCashFlow >= 0 ? "text-success" : "text-[#b64b52]"}`}>{formatInr(netCashFlow)}</div>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Plan</th>
              <th className="text-right p-3">Projected</th>
              <th className="text-right p-3">Actual</th>
              <th className="text-right p-3">Variance</th>
              <th className="text-right p-3">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.key} className="border-t border-[#edf0ee]">
                <td className="p-3 font-semibold">{t.label}</td>
                <td className="p-3 text-right">{formatInr(t.projected)}</td>
                <td className="p-3 text-right">
                  <Link href="/transactions" className="text-info hover:underline">{formatInr(t.actual)}</Link>
                </td>
                <td className={`p-3 text-right font-bold ${t.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{formatInr(t.variance)}</td>
                <td className={`p-3 text-right ${t.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{t.projected ? `${t.variancePct.toFixed(0)}%` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-navy mb-4">Set projections for {MONTH_NAMES[month - 1]} {year}</h3>
        <form action={savePlans} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="hidden" name="financial_year" value={year} />
          <input type="hidden" name="month" value={month} />
          {PLAN_TYPES.map((p) => (
            <div key={p.key}>
              <label className="block text-xs text-muted mb-1.5">{p.label} (₹)</label>
              <input name={p.key} type="number" step="0.01" defaultValue={projectedByType[p.key] || ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
            </div>
          ))}
          <div className="col-span-2">
            <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
              Save projections
            </button>
          </div>
        </form>
      </div>

      <h3 className="text-sm font-bold text-navy mb-3 mt-8">Category breakdown — {MONTH_NAMES[month - 1]} {year}</h3>
      <form action={saveCategoryPlans}>
        <input type="hidden" name="financial_year" value={year} />
        <input type="hidden" name="month" value={month} />
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-3">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Projected</th>
                <th className="text-right p-3">Actual</th>
                <th className="text-right p-3">Variance</th>
                <th className="text-right p-3">Variance %</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((c) => (
                <tr key={c.id} className="border-t border-[#edf0ee]">
                  <td className="p-3 font-semibold">{c.label}</td>
                  <td className="p-3 text-right">
                    <input
                      name={`category_${c.id}`}
                      type="number"
                      step="0.01"
                      defaultValue={c.projected || ""}
                      className="w-28 border border-[#e3ddd7] rounded-lg p-1.5 text-right text-xs"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <Link href="/transactions" className="text-info hover:underline">{formatInr(c.actual)}</Link>
                  </td>
                  <td className={`p-3 text-right font-bold ${c.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{formatInr(c.variance)}</td>
                  <td className={`p-3 text-right ${c.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{c.projected ? `${c.variancePct.toFixed(0)}%` : "-"}</td>
                </tr>
              ))}
              {categoryRows.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted">No categories yet — add some in Settings.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button type="submit" className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm mb-8">
          Save category projections
        </button>
      </form>

      <h3 className="text-sm font-bold text-navy mb-3">Income sources — {MONTH_NAMES[month - 1]} {year}</h3>
      <p className="text-xs text-muted mb-3">
        Projected comes from each source&apos;s expected amount — edit it on the{" "}
        <Link href="/income-sources" className="text-info hover:underline">Income Sources</Link> page. Actual counts
        transactions explicitly linked to that source via Add Entry.
      </p>
      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Projected</th>
              <th className="text-right p-3">Actual</th>
              <th className="text-right p-3">Variance</th>
              <th className="text-right p-3">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {incomeSourceRows.map((s) => (
              <tr key={s.id} className="border-t border-[#edf0ee]">
                <td className="p-3 font-semibold">{s.label}</td>
                <td className="p-3">{s.type ?? "-"}</td>
                <td className="p-3 text-right">{formatInr(s.projected)}</td>
                <td className="p-3 text-right">
                  <Link href="/transactions" className="text-info hover:underline">{formatInr(s.actual)}</Link>
                </td>
                <td className={`p-3 text-right font-bold ${s.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{formatInr(s.variance)}</td>
                <td className={`p-3 text-right ${s.variance >= 0 ? "text-success" : "text-[#b64b52]"}`}>{s.projected ? `${s.variancePct.toFixed(0)}%` : "-"}</td>
              </tr>
            ))}
            {incomeSourceRows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">No income sources yet — add one on the Income Sources page.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
