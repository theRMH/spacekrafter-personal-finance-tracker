import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE } from "@/lib/commitments";
import { createUtilityConnection } from "./actions";
import { markCommitmentPaid } from "../insurance/actions";

const UTILITY_TYPES = ["Electricity", "Gas/LPG", "Water", "Internet", "Mobile", "Cable/DTH", "Maintenance"];
const LOCATIONS = ["Home", "Office", "Additional Residence", "Rental Property", "Business Location"];

export default async function UtilitiesPage() {
  const supabase = createClient();

  const { data: connections } = await supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, due_date, status, provider, utility_details(utility_type, location, consumer_number, billing_cycle)")
    .eq("commitment_type", "utility")
    .order("due_date", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Utilities</h1>
      <p className="text-sm text-muted mt-1 mb-6">Electricity, gas, water, internet, mobile and locations</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Connection</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Provider</th>
              <th className="text-left p-3">Expected</th>
              <th className="text-left p-3">Due date</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(connections || []).map((c: any) => {
              const status = commitmentDisplayStatus(c.status, c.due_date);
              return (
                <tr key={c.id} className="border-t border-[#edf0ee]">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3">{c.utility_details?.utility_type}</td>
                  <td className="p-3">{c.utility_details?.location}</td>
                  <td className="p-3">{c.provider ?? "-"}</td>
                  <td className="p-3">{c.expected_amount ? formatInr(c.expected_amount) : "-"}</td>
                  <td className="p-3">{formatDate(c.due_date)}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
                  </td>
                  <td className="p-3">
                    {status !== "paid" && (
                      <form action={markCommitmentPaid}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-info text-[11px] font-semibold">Mark paid</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!connections || connections.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No connections yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-navy mb-4">Add connection</h3>
        <form action={createUtilityConnection} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1.5">Connection name</label>
            <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Home electricity" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Utility type</label>
            <select name="utility_type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              {UTILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Location</label>
            <select name="location" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Provider</label>
            <input name="provider" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Consumer number</label>
            <input name="consumer_number" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Billing cycle</label>
            <select name="billing_cycle" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Expected amount (₹)</label>
            <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Due date</label>
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
            <label className="block text-xs text-muted mb-1.5">Linked account</label>
            <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="">-</option>
              {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
              + Add connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
