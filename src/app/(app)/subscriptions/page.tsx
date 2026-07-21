import { createClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/format";
import AddSubscriptionForm from "./add-subscription-form";
import SubscriptionRow from "./subscription-row";

export default async function SubscriptionsPage() {
  const supabase = createClient();

  const { data: subs } = await supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, frequency, due_date, status, subscription_details(category, auto_renew)")
    .eq("commitment_type", "subscription")
    .order("due_date", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  const active = (subs || []).filter((s) => s.status !== "cancelled");
  const monthlyTotal = active.reduce((sum, s) => {
    const amt = Number(s.expected_amount || 0);
    const mult = s.frequency === "annual" ? 1 / 12 : s.frequency === "quarterly" ? 1 / 3 : s.frequency === "half_yearly" ? 1 / 6 : 1;
    return sum + amt * mult;
  }, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Subscriptions</h1>
      <p className="text-sm text-muted mt-1 mb-4">Personal and office recurring services</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5 mb-6 max-w-xs">
        <div className="text-[11px] uppercase tracking-wide text-muted">Estimated monthly commitment</div>
        <div className="text-2xl font-extrabold text-navy mt-2">{formatInr(monthlyTotal)}</div>
        <div className="text-[11px] text-muted mt-2">Across {active.length} active subscription(s)</div>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Subscription</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Usage</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Renewal date</th>
              <th className="text-left p-3">Auto-renew</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(subs || []).map((s: any) => (
              <SubscriptionRow key={s.id} sub={s} accounts={accounts || []} />
            ))}
            {(!subs || subs.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No subscriptions yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddSubscriptionForm accounts={accounts || []} />
    </div>
  );
}
