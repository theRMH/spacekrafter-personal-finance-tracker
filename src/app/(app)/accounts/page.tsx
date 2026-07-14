import { createClient } from "@/lib/supabase/server";
import { createAccount } from "./actions";
import { getAccountMovements } from "@/lib/balances";
import { formatInr } from "@/lib/format";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi_wallet", label: "UPI / Wallet" },
  { value: "cash", label: "Cash" },
  { value: "loan", label: "Loan Account" },
];

export default async function AccountsPage() {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, personal_or_office, opening_balance, active, reconciliation_status, last_imported_at")
    .order("created_at", { ascending: true });

  const movementByAccount = await getAccountMovements(supabase);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Accounts</h1>
          <p className="text-sm text-muted mt-1">
            Balances across bank accounts, cards, UPI, wallets and cash
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {(accounts || []).map((acc) => {
          const calculated = Number(acc.opening_balance) + (movementByAccount.get(acc.id) || 0);
          return (
            <div key={acc.id} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
              <div className="text-[11px] uppercase tracking-wide text-muted">{acc.name}</div>
              <div className="text-2xl font-extrabold text-navy mt-2">{formatInr(calculated)}</div>
              <div className="flex gap-2 mt-3 text-[11px]">
                <span className="rounded-full bg-[#edf1f7] text-info px-2 py-1 font-semibold">
                  {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label ?? acc.type}
                </span>
                <span className="rounded-full bg-[#eef2ef] text-[#53615a] px-2 py-1 font-semibold capitalize">
                  {acc.personal_or_office}
                </span>
              </div>
              <div className="text-[11px] text-muted mt-2 capitalize">
                {acc.reconciliation_status.replace("_", " ")}
                {acc.last_imported_at ? ` · last imported ${new Date(acc.last_imported_at).toLocaleDateString("en-IN")}` : ""}
              </div>
            </div>
          );
        })}
        {(!accounts || accounts.length === 0) && (
          <p className="text-sm text-muted">No accounts yet — add your first one below.</p>
        )}
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-xl">
        <h3 className="text-sm font-bold text-navy mb-4">Add account</h3>
        <form action={createAccount} className="grid gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Account name</label>
            <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="HDFC Personal" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Type</label>
              <select name="type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
              <select name="personal_or_office" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
                <option value="personal">Personal</option>
                <option value="office">Office</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Opening balance (₹)</label>
            <input
              name="opening_balance"
              type="number"
              step="0.01"
              defaultValue={0}
              className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
            />
          </div>
          <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
            + Add account
          </button>
        </form>
      </div>
    </div>
  );
}
