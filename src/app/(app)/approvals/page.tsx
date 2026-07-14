import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function ApprovalsPage() {
  const supabase = createClient();
  const { data: requests } = await supabase
    .from("approval_requests")
    .select("id, request_type, target_table, reason, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Approvals</h1>
      <p className="text-sm text-muted mt-1 mb-6">Payment, deletion, correction and reconciliation requests</p>

      {(!requests || requests.length === 0) && (
        <div className="bg-[#f0f3f8] border border-[#d9e0ec] rounded-2xl p-5 text-sm text-[#394a68] max-w-xl">
          No pending approvals. Accountant deletion/correction requests will appear here once the Accountant
          role and multi-user permissions are enabled in a future milestone — for now, the Owner has direct
          access to edit and delete records.
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Record</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-[#edf0ee]">
                  <td className="p-3">{formatDate(r.created_at)}</td>
                  <td className="p-3 capitalize">{r.request_type}</td>
                  <td className="p-3">{r.target_table}</td>
                  <td className="p-3">{r.reason ?? "-"}</td>
                  <td className="p-3 capitalize">{r.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
