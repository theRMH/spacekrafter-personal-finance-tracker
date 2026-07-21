import { createClient } from "@/lib/supabase/server";
import AddConnectionForm from "./add-connection-form";
import ConnectionRow from "./connection-row";

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
            {(connections || []).map((c: any) => (
              <ConnectionRow key={c.id} connection={c} accounts={accounts || []} />
            ))}
            {(!connections || connections.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No connections yet — add one below.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddConnectionForm accounts={accounts || []} />
    </div>
  );
}
