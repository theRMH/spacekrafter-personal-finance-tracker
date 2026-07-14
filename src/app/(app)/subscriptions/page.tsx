import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE } from "@/lib/commitments";
import { createSubscription, cancelSubscription } from "./actions";
import { markCommitmentPaid } from "../insurance/actions";

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
            {(subs || []).map((s: any) => {
              const status = commitmentDisplayStatus(s.status, s.due_date);
              return (
                <tr key={s.id} className="border-t border-[#edf0ee]">
                  <td className="p-3 font-semibold">{s.name}</td>
                  <td className="p-3">{s.subscription_details?.category ?? "-"}</td>
                  <td className="p-3 capitalize">{s.personal_or_office}</td>
                  <td className="p-3">{s.expected_amount ? formatInr(s.expected_amount) : "-"}</td>
                  <td className="p-3">{formatDate(s.due_date)}</td>
                  <td className="p-3">{s.subscription_details?.auto_renew ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {status !== "paid" && status !== "cancelled" && (
                      <form action={markCommitmentPaid}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-info text-[11px] font-semibold">Mark paid</button>
                      </form>
                    )}
                    {status !== "cancelled" && (
                      <form action={cancelSubscription}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">Cancel</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!subs || subs.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No subscriptions yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-navy mb-4">Add subscription</h3>
        <form action={createSubscription} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1.5">Name</label>
            <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Netflix" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Category</label>
            <input name="category" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Entertainment" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Amount (₹)</label>
            <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Frequency</label>
            <select name="frequency" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Renewal date</label>
            <input name="due_date" type="date" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
            <select name="personal_or_office" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="personal">Personal</option>
              <option value="office">Office</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Linked account/card</label>
            <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="">-</option>
              {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" name="auto_renew" id="auto_renew" className="w-4 h-4" />
            <label htmlFor="auto_renew" className="text-xs text-muted">Auto-renews</label>
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
              + Add subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
