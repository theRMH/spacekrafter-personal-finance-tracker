import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { categorizeTransaction, confirmProvisional, softDeleteTransaction } from "./actions";

const TYPE_PILL: Record<string, string> = {
  income: "bg-[#e5f4eb] text-success",
  expense: "bg-[#fdeaea] text-[#b64b52]",
  transfer: "bg-[#e8eff8] text-info",
  investment: "bg-[#f3eee8] text-earth",
};

const STATUS_PILL: Record<string, string> = {
  confirmed: "bg-[#e5f4eb] text-success",
  provisional: "bg-[#fff0dc] text-[#a9793b]",
  needs_review: "bg-[#fdeaea] text-[#b64b52]",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const statusFilter = searchParams?.status;

  let query = supabase
    .from("transactions")
    .select(
      "id, transaction_date, amount, type, personal_or_office, payee_payer, narration, status, source, accounts(name), categories(id, group_name), subcategories(id, name)"
    )
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: transactions } = await query;

  const { data: categories } = await supabase.from("categories").select("id, group_name").order("group_name");
  const { data: subcategories } = await supabase.from("subcategories").select("id, name, category_id").order("name");

  const filters = [
    { label: "All", href: "/transactions" },
    { label: "Confirmed", href: "/transactions?status=confirmed" },
    { label: "Provisional", href: "/transactions?status=provisional" },
    { label: "Needs review", href: "/transactions?status=needs_review" },
  ];

  return (
    <div>
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Transactions</h1>
          <p className="text-sm text-muted mt-1">All imported, manual, pending and matched money movements</p>
        </div>
        <Link href="/add-entry" className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm">
          + Add transaction
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className={`rounded-full px-3 py-2 text-xs border ${
              (statusFilter ?? "") === (f.href.split("status=")[1] ?? "")
                ? "bg-navy text-white border-navy"
                : "bg-white border-[#e3ddd7] text-navy"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Account</th>
              <th className="text-left p-3">Payee / Payer</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Usage</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(transactions || []).map((tx: any) => (
              <tr key={tx.id} className="border-t border-[#edf0ee] align-top">
                <td className="p-3 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                <td className="p-3 whitespace-nowrap">{tx.accounts?.name ?? "-"}</td>
                <td className="p-3">{tx.payee_payer ?? "-"}</td>
                <td className="p-3">
                  {tx.categories?.group_name ?? "Uncategorised"}
                  {tx.subcategories?.name ? ` / ${tx.subcategories.name}` : ""}
                </td>
                <td className="p-3 capitalize">{tx.personal_or_office}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_PILL[tx.status] ?? ""}`}>
                    {tx.status.replace("_", " ")}
                  </span>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${TYPE_PILL[tx.type] ?? ""}`}>
                      {tx.type}
                    </span>
                  </div>
                </td>
                <td className={`p-3 text-right font-bold whitespace-nowrap ${tx.type === "income" ? "text-success" : "text-[#b64b52]"}`}>
                  {tx.type === "income" ? "+" : "-"}
                  {formatInr(tx.amount)}
                </td>
                <td className="p-3 min-w-[220px]">
                  {tx.status === "needs_review" && (
                    <form action={categorizeTransaction} className="grid gap-1.5">
                      <input type="hidden" name="id" value={tx.id} />
                      <select name="category_id" required className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]">
                        <option value="">Category…</option>
                        {(categories || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.group_name}
                          </option>
                        ))}
                      </select>
                      <select name="subcategory_id" className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]">
                        <option value="">Subcategory…</option>
                        {(subcategories || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select name="personal_or_office" defaultValue={tx.personal_or_office} className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]">
                        <option value="personal">Personal</option>
                        <option value="office">Office</option>
                        <option value="shared">Shared</option>
                      </select>
                      <button type="submit" className="bg-navy text-white rounded-lg py-1.5 text-[11px] font-semibold">
                        Confirm
                      </button>
                    </form>
                  )}
                  {tx.status === "provisional" && (
                    <form action={confirmProvisional}>
                      <input type="hidden" name="id" value={tx.id} />
                      <button type="submit" className="bg-[#edf1f7] text-info rounded-lg px-2 py-1.5 text-[11px] font-semibold w-full">
                        Confirm now
                      </button>
                    </form>
                  )}
                  {tx.status === "confirmed" && (
                    <form action={softDeleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">
                  No transactions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
