import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE, FREQUENCIES } from "@/lib/commitments";
import { createInsurancePolicy, markCommitmentPaid } from "./actions";

const INSURANCE_TYPES = ["Health", "Life", "Term", "Bike", "Car", "Property", "Business", "Personal Accident", "ULIP/Endowment"];

export default async function InsurancePage() {
  const supabase = createClient();

  const { data: policies } = await supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, frequency, due_date, status, provider, insurance_details(insurance_type, policy_number, insured_person_or_asset, nominee)")
    .eq("commitment_type", "insurance")
    .order("due_date", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Insurance</h1>
      <p className="text-sm text-muted mt-1 mb-6">Policies, renewals, premiums and documents</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Policy</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Insured</th>
              <th className="text-left p-3">Provider</th>
              <th className="text-left p-3">Premium</th>
              <th className="text-left p-3">Renewal date</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(policies || []).map((p: any) => {
              const status = commitmentDisplayStatus(p.status, p.due_date);
              return (
                <tr key={p.id} className="border-t border-[#edf0ee]">
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3">{p.insurance_details?.insurance_type}</td>
                  <td className="p-3">{p.insurance_details?.insured_person_or_asset ?? "-"}</td>
                  <td className="p-3">{p.provider ?? "-"}</td>
                  <td className="p-3">{p.expected_amount ? formatInr(p.expected_amount) : "-"}</td>
                  <td className="p-3">{formatDate(p.due_date)}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
                  </td>
                  <td className="p-3">
                    {status !== "paid" && (
                      <form action={markCommitmentPaid}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-info text-[11px] font-semibold">
                          Mark paid
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!policies || policies.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No policies yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
        <h3 className="text-sm font-bold text-navy mb-4">Add policy</h3>
        <form action={createInsurancePolicy} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1.5">Policy name</label>
            <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Family health cover" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Insurance type</label>
            <select name="insurance_type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              {INSURANCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Provider</label>
            <input name="provider" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Policy number</label>
            <input name="policy_number" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Insured person / asset</label>
            <input name="insured_person_or_asset" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Premium (₹)</label>
            <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Frequency</label>
            <select name="frequency" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
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
            <label className="block text-xs text-muted mb-1.5">Linked account</label>
            <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="">-</option>
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Nominee</label>
            <input name="nominee" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1.5">Documents</label>
            <button type="button" disabled className="w-full border border-dashed border-[#aab0bf] rounded-xl p-2.5 text-xs text-muted bg-[#faf9f7] cursor-not-allowed">
              Add document — coming soon
            </button>
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
              + Add policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
