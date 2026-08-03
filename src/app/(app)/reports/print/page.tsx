import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import PrintButton from "./print-button";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; usage?: string };
}) {
  const supabase = createClient();
  const fromDate = searchParams?.from;
  const toDate = searchParams?.to;
  const usageFilter = searchParams?.usage;

  let query = supabase
    .from("transactions")
    .select("amount, type, personal_or_office, transaction_date, categories(group_name)")
    .is("deleted_at", null)
    .eq("status", "confirmed");
  if (fromDate) query = query.gte("transaction_date", fromDate);
  if (toDate) query = query.lte("transaction_date", toDate);
  if (usageFilter) query = query.eq("personal_or_office", usageFilter);
  const { data: tx } = await query;

  const all = tx || [];
  const income = all.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = all.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const personalSpend = all.filter((t) => t.type === "expense" && t.personal_or_office === "personal").reduce((s, t) => s + Number(t.amount), 0);
  const officeSpend = all.filter((t) => t.type === "expense" && t.personal_or_office === "office").reduce((s, t) => s + Number(t.amount), 0);

  const byCategory = new Map<string, number>();
  for (const t of all.filter((t) => t.type === "expense")) {
    const key = (t as any).categories?.group_name || "Uncategorised";
    byCategory.set(key, (byCategory.get(key) || 0) + Number(t.amount));
  }
  const categoryRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  const rangeLabel = fromDate && toDate ? `${formatDate(fromDate)} – ${formatDate(toDate)}` : fromDate ? `From ${formatDate(fromDate)}` : toDate ? `Up to ${formatDate(toDate)}` : "All time";
  const generatedOn = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="print:hidden mb-6">
        <PrintButton />
      </div>

      <div className="flex justify-between items-start mb-8 border-b border-[#e3ddd7] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Financial Overview</h1>
          <p className="text-sm text-muted mt-1">{rangeLabel}{usageFilter ? ` · ${usageFilter}` : ""}</p>
        </div>
        <p className="text-xs text-muted">Generated {generatedOn}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-[#e3ddd7] rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Total income</div>
          <div className="text-xl font-extrabold text-navy mt-1">{formatInr(income)}</div>
        </div>
        <div className="border border-[#e3ddd7] rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Total expenses</div>
          <div className="text-xl font-extrabold text-navy mt-1">{formatInr(expense)}</div>
        </div>
        <div className="border border-[#e3ddd7] rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Net cash flow</div>
          <div className="text-xl font-extrabold text-navy mt-1">{formatInr(income - expense)}</div>
        </div>
        <div className="border border-[#e3ddd7] rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Personal / Office spend</div>
          <div className="text-xl font-extrabold text-navy mt-1">{formatInr(personalSpend)} / {formatInr(officeSpend)}</div>
        </div>
      </div>

      <h3 className="text-sm font-bold text-navy mb-3">Spend by category</h3>
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b border-[#e3ddd7] text-muted uppercase text-[10px]">
            <th className="text-left py-2">Category</th>
            <th className="text-right py-2">Amount</th>
            <th className="text-right py-2">% of spend</th>
          </tr>
        </thead>
        <tbody>
          {categoryRows.map(([cat, amt]) => (
            <tr key={cat} className="border-b border-[#edf0ee]">
              <td className="py-2">{cat}</td>
              <td className="py-2 text-right font-semibold">{formatInr(amt)}</td>
              <td className="py-2 text-right">{expense ? `${((amt / expense) * 100).toFixed(0)}%` : "-"}</td>
            </tr>
          ))}
          {categoryRows.length === 0 && (
            <tr><td colSpan={3} className="py-6 text-center text-muted">No expenses in this period.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
