import { createClient } from "@/lib/supabase/server";
import { getAccountMovements } from "@/lib/balances";
import AddAccountForm from "./add-account-form";
import AccountCard from "./account-card";

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
          return <AccountCard key={acc.id} account={acc} calculated={calculated} />;
        })}
        {(!accounts || accounts.length === 0) && (
          <p className="text-sm text-muted">No accounts yet — add your first one below.</p>
        )}
      </div>

      <AddAccountForm />
    </div>
  );
}
