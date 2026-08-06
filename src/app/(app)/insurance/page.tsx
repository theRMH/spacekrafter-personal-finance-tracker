import { createClient } from "@/lib/supabase/server";
import AddPolicyForm from "./add-policy-form";
import PolicyRow from "./policy-row";
import DateRangeFilter from "@/components/date-range-filter";
import DownloadBar from "@/components/download-bar";

export default async function InsurancePage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const supabase = createClient();
  const fromDate = searchParams?.from;
  const toDate = searchParams?.to;

  let query = supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, frequency, due_date, status, provider, insurance_details(insurance_type, policy_number, insured_person_or_asset, nominee)")
    .eq("commitment_type", "insurance")
    .order("due_date", { ascending: true });
  if (fromDate) query = query.gte("due_date", fromDate);
  if (toDate) query = query.lte("due_date", toDate);

  const [{ data: policies }, { data: accounts }] = await Promise.all([
    query,
    supabase.from("accounts").select("id, name").order("name"),
  ]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-navy">Insurance</h1>
          <p className="text-sm text-muted mt-1 mb-6">Policies, renewals, premiums and documents</p>
        </div>
        <DownloadBar csvHref="/api/export/insurance" />
      </div>

      <div className="print:hidden">
        <DateRangeFilter from={fromDate} to={toDate} clearHref="/insurance" />
      </div>

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
            {(policies || []).map((p: any) => (
              <PolicyRow key={p.id} policy={p} accounts={accounts || []} />
            ))}
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
