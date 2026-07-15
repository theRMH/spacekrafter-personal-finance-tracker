import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE } from "@/lib/commitments";
import { markCommitmentPaid } from "./actions";
import AddPolicyForm from "./add-policy-form";

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

      <AddPolicyForm accounts={accounts || []} />
    </div>
  );
}
