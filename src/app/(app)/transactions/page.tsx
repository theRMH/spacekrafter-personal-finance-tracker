import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/format";
import { ALL_TYPES } from "@/lib/transaction-types";
import TransactionsTableBody from "./transactions-table-body";
import DownloadBar from "@/components/download-bar";

const TYPE_OPTIONS = ALL_TYPES;

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
      "id, transaction_date, amount, type, personal_or_office, payee_payer, narration, reference, status, source, account_id, payment_mode, accounts(name), categories(id, group_name), subcategories(id, name)"
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
    supabase.from("categories").select("id, group_name, default_personal_or_office").order("group_name"),
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

  // Usage tabs keep every other active filter when you switch between them, same pattern as the status tabs.
  function hrefForUsage(usage?: string) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (accountFilter) params.set("account", accountFilter);
    if (usage) params.set("usage", usage);
    if (typeFilter) params.set("type", typeFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (payeeFilter) params.set("payee", payeeFilter);
    const qs = params.toString();
    return qs ? `/transactions?${qs}` : "/transactions";
  }
  const usageFilters = [
    { label: "All", usage: undefined },
    { label: "Personal", usage: "personal" },
    { label: "Office", usage: "office" },
    { label: "Shared", usage: "shared" },
  ];

  const tx = transactions || [];
  const scoreIncome = tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const scoreExpense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const scoreCards = [
    { label: "Income (filtered)", value: formatInr(scoreIncome), colorClass: "text-success" },
    { label: "Expense (filtered)", value: formatInr(scoreExpense), colorClass: "text-[#b64b52]" },
    { label: "Net (filtered)", value: formatInr(scoreIncome - scoreExpense), colorClass: scoreIncome - scoreExpense >= 0 ? "text-success" : "text-[#b64b52]" },
    { label: "Transactions", value: String(tx.length), colorClass: "text-navy" },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Transactions</h1>
          <p className="text-sm text-muted mt-1">All imported, manual, pending and matched money movements</p>
        </div>
        <div className="flex gap-2 items-center">
          <DownloadBar csvHref="/api/export/transactions" />
          <Link href="/add-entry" className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm print:hidden">
            + Add transaction
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {scoreCards.map((c) => (
          <div key={c.label} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted">{c.label}</div>
            <div className={`text-lg font-extrabold mt-1 ${c.colorClass}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap print:hidden">
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

      <div className="flex items-center gap-2 mb-4 flex-wrap print:hidden">
        <span className="text-[11px] uppercase tracking-wide text-muted mr-1">Home / Office</span>
        {usageFilters.map((u) => (
          <Link
            key={u.label}
            href={hrefForUsage(u.usage)}
            className={`rounded-full px-3 py-2 text-xs border font-semibold ${
              (usageFilter ?? "") === (u.usage ?? "")
                ? "bg-navy text-white border-navy"
                : "bg-white border-[#e3ddd7] text-navy"
            }`}
          >
            {u.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 mb-4 bg-white border border-[#e3ddd7] rounded-xl p-3 print:hidden">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {usageFilter && <input type="hidden" name="usage" value={usageFilter} />}
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
        <table className="w-full text-xs min-w-[960px]">
          <TransactionsTableBody
            transactions={transactions || []}
            accounts={accounts || []}
            categories={categories || []}
            subcategories={subcategories || []}
          />
        </table>
      </div>
    </div>
  );
}
