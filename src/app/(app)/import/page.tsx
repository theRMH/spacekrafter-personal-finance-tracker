import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import UploadForm from "./upload-form";

export default async function ImportPage() {
  const supabase = createClient();

  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");
  const { data: mappings } = await supabase.from("import_mappings").select("account_id, column_mapping");
  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, file_name, total_rows, accepted, duplicates, transfers, matched, unknown, rejected, created_at, accounts(name)")
    .order("created_at", { ascending: false })
    .limit(10);

  const savedMappings = Object.fromEntries((mappings || []).map((m) => [m.account_id, m.column_mapping]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Import Statements</h1>
      <p className="text-sm text-muted mt-1 mb-6">Upload statements, automate categorisation and confirm only exceptions</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 mb-8">
        <UploadForm accounts={accounts || []} savedMappings={savedMappings as any} />
      </div>

      <div className="notice bg-[#f0f3f8] border border-[#d9e0ec] rounded-2xl p-4 text-xs text-[#394a68] mb-8">
        Statements are the preferred source of truth. Rows that match an existing provisional manual entry are
        merged into that entry rather than duplicated; rows matching a due Insurance/Utility/Subscription
        commitment mark it paid automatically; unmatched unknown rows land in Transactions → Needs review.
      </div>

      <h3 className="text-sm font-bold text-navy mb-3">Import history</h3>
      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Account</th>
              <th className="text-left p-3">File</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Accepted</th>
              <th className="text-right p-3">Duplicates</th>
              <th className="text-right p-3">Transfers</th>
              <th className="text-right p-3">Matched</th>
              <th className="text-right p-3">Needs review</th>
            </tr>
          </thead>
          <tbody>
            {(batches || []).map((b: any) => (
              <tr key={b.id} className="border-t border-[#edf0ee]">
                <td className="p-3">{formatDate(b.created_at)}</td>
                <td className="p-3">{b.accounts?.name}</td>
                <td className="p-3">{b.file_name}</td>
                <td className="p-3 text-right">{b.total_rows}</td>
                <td className="p-3 text-right">{b.accepted}</td>
                <td className="p-3 text-right">{b.duplicates}</td>
                <td className="p-3 text-right">{b.transfers}</td>
                <td className="p-3 text-right">{b.matched}</td>
                <td className="p-3 text-right">{b.unknown}</td>
              </tr>
            ))}
            {(!batches || batches.length === 0) && (
              <tr><td colSpan={9} className="p-6 text-center text-muted">No imports yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
