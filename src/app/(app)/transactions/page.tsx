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

// "provisional" is the internal/DB status name; shown to Owners as "Unverified"
// since that's clearer than accounting jargon.
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  provisional: "Unverified",
  needs_review: "Needs review",
};

const TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
  { value: "investment", label: "Investment" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    from?: string;
    to?: string;
    account?: string;
    usage?: string;
    type?: string;
    category?: string;
    payee?: string;
  };
}) {
  const supabase = createClient();
  const statusFilter = searchParams?.status;
  const fromDate = searchParams?.from;
  const toDate = searchParams?.to;
  const accountFilter = searchParams?.account;
  const usageFilter = searchParams?.usage;
  const typeFilter = searchParams?.type;
  const categoryFilter = searchParams?.category;
  const payeeFilter = searchParams?.payee;

  let query = supabase
    .from("transactions")
    .select(
      "id, transaction_date, amount, type, personal_or_office, payee_payer, narration, status, source, account_id, accounts(name), categories(id, group_name), subcategories(id, name)"
    )
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);
  if (fromDate) query = query.gte("transaction_date", fromDate);
  if (toDate) query = query.lte("transaction_date", toDate);
  if (accountFilter) query = query.eq("account_id", accountFilter);
  if (usageFilter) query = query.eq("personal_or_office", usageFilter);
  if (typeFilter) query = query.eq("type", typeFilter);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);
  if (payeeFilter) query = query.ilike("payee_payer", `%${payeeFilter}%`);

  const [{ data: transactions }, { data: categories }, { data: subcategories }, { data: accounts }] = await Promise.all([
    query,
    supabase.from("categories").select("id, group_name").order("group_name"),
    supabase.from("subcategories").select("id, name, category_id").order("name"),
    supabase.from("accounts").select("id, name").order("name"),
  ]);

  // Status tabs keep every other active filter when you switch between them.
  function hrefForStatus(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (accountFilter) params.set("account", accountFilter);
    if (usageFilter) params.set("usage", usageFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (payeeFilter) params.set("payee", payeeFilter);
    const qs = params.toString();
    return qs ? `/transactions?${qs}` : "/transactions";
  }

  const hasFilters = Boolean(fromDate || toDate || accountFilter || usageFilter || typeFilter || categoryFilter || payeeFilter);

  const filters = [
    { label: "All", status: undefined },
    { label: "Confirmed", status: "confirmed" },
    { label: "Unverified", status: "provisional" },
    { label: "Needs review", status: "needs_review" },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
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
            href={hrefForStatus(f.status)}
            className={`rounded-full px-3 py-2 text-xs border ${
              (statusFilter ?? "") === (f.status ?? "")
                ? "bg-navy text-white border-navy"
                : "bg-white border-[#e3ddd7] text-navy"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 mb-4 bg-white border border-[#e3ddd7] rounded-xl p-3">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div>
          <label className="block text-[10px] text-muted mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-muted mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-muted mb-1">Account</label>
          <select name="account" defaultValue={accountFilter || ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs min-w-[130px]">
            <option value="">All accounts</option>
            {(accounts || []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
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
        <div>
          <label className="block text-[10px] text-muted mb-1">Type</label>
          <select name="type" defaultValue={typeFilter || ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-muted mb-1">Category</label>
          <select name="category" defaultValue={categoryFilter || ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs min-w-[150px]">
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>{c.group_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-muted mb-1">Payee / Payer</label>
          <input type="text" name="payee" defaultValue={payeeFilter} placeholder="Search…" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
        </div>
        <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">
          Apply
        </button>
        {hasFilters && (
          <Link href={statusFilter ? `/transactions?status=${statusFilter}` : "/transactions"} className="text-[11px] text-muted underline px-1">
            Clear filters
          </Link>
        )}
      </form>

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
                  <span className={`inline-flex rounded-full px-2 py-1 font-bold ${STATUS_PILL[tx.status] ?? ""}`}>
                    {STATUS_LABEL[tx.status] ?? tx.status}
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
