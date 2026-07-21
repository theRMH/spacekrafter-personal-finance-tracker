import { createClient } from "@/lib/supabase/server";
import AddIncomeSourceForm from "./add-income-source-form";
import IncomeSourceRow from "./income-source-row";

export default async function IncomeSourcesPage() {
  const supabase = createClient();

  const { data: sources } = await supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, frequency, due_date, status, income_source_details(income_type, payer_or_property, notes)")
    .eq("commitment_type", "expected_income")
    .order("due_date", { ascending: true });

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Income Sources</h1>
      <p className="text-sm text-muted mt-1 mb-6">Named recurring income — rent, business revenue, investment payouts and more</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Payer / Property</th>
              <th className="text-left p-3">Expected amount</th>
              <th className="text-left p-3">Next expected date</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(sources || []).map((s: any) => (
              <IncomeSourceRow key={s.id} source={s} accounts={accounts || []} />
            ))}
            {(!sources || sources.length === 0) && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted">No income sources yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddIncomeSourceForm accounts={accounts || []} />
    </div>
  );
}
