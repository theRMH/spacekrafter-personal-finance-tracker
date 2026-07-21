import { createClient } from "@/lib/supabase/server";
import EntryForm from "./entry-form";

export default async function AddEntryPage() {
  const supabase = createClient();

  const [{ data: accounts }, { data: categories }, { data: subcategories }, { data: incomeSources }] = await Promise.all([
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("categories").select("id, name, group_name, default_personal_or_office").order("group_name"),
    supabase.from("subcategories").select("id, name, category_id").order("name"),
    supabase.from("commitments").select("id, name").eq("commitment_type", "expected_income").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Add Entry</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Manual entry for cash, exceptions and one-off transactions
      </p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
        <EntryForm
          accounts={accounts || []}
          categories={categories || []}
          subcategories={subcategories || []}
          incomeSources={incomeSources || []}
        />
      </div>
    </div>
  );
}
