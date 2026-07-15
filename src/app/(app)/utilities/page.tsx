import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE } from "@/lib/commitments";
import { markCommitmentPaid } from "../insurance/actions";
import AddConnectionForm from "./add-connection-form";

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

      <AddConnectionForm accounts={accounts || []} />
    </div>
  );
}
