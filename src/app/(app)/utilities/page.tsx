import { createClient } from "@/lib/supabase/server";
import AddConnectionForm from "./add-connection-form";
import ConnectionRow from "./connection-row";
import DateRangeFilter from "@/components/date-range-filter";

export default async function UtilitiesPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const supabase = createClient();
  const fromDate = searchParams?.from;
  const toDate = searchParams?.to;

  let query = supabase
    .from("commitments")
    .select("id, name, personal_or_office, expected_amount, due_date, status, provider, utility_details(utility_type, location, consumer_number, billing_cycle)")
    .eq("commitment_type", "utility")
    .order("due_date", { ascending: true });
  if (fromDate) query = query.gte("due_date", fromDate);
  if (toDate) query = query.lte("due_date", toDate);
  const { data: connections } = await query;

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-navy">Utilities</h1>
          <p className="text-sm text-muted mt-1 mb-6">Electricity, gas, water, internet, mobile and locations</p>
        </div>
        <a href="/api/export/utilities" className="bg-white border border-[#e3ddd7] rounded-xl px-4 py-2.5 text-sm font-semibold text-navy">
          Export (CSV)
        </a>
      </div>

      <DateRangeFilter from={fromDate} to={toDate} clearHref="/utilities" />

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
