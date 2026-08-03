import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { createCategoryRule, deleteCategoryRule } from "./actions";
import CategoriesPanel from "./categories-panel";

export default async function SettingsPage() {
  const supabase = createClient();

  const [{ data: categories }, { data: subcategories }, { data: rules }, { data: auditLog }] = await Promise.all([
    supabase.from("categories").select("id, group_name").order("group_name"),
    supabase.from("subcategories").select("id, name, category_id, categories(group_name)").order("name"),
    supabase.from("category_rules").select("id, keyword, personal_or_office, categories(group_name), subcategories(name)").order("priority", { ascending: false }),
    supabase.from("audit_log").select("id, action, entity_table, entity_id, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const categoriesWithSubs = (categories || []).map((c) => ({
    id: c.id,
    group_name: c.group_name,
    subcategories: (subcategories || []).filter((s) => s.category_id === c.id).map((s) => ({ id: s.id, name: s.name })),
  }));

  return (
    <div className="grid grid-cols-1 gap-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-muted mt-1">Categories, subcategories, rules, imports and audit</p>
      </div>

      <section className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
        <h3 className="text-sm font-bold text-navy mb-1">Categories</h3>
        <p className="text-xs text-muted mb-4">Grouped by category — expand one to see and manage its subcategories.</p>
        <CategoriesPanel categories={categoriesWithSubs} />
      </section>

      <section className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
        <h3 className="text-sm font-bold text-navy mb-1">Categorisation rules</h3>
        <p className="text-xs text-muted mb-4">
          Exact keyword rules are applied first during Import Statements (CAT-01) — e.g. narration contains
          &quot;SWIGGY&quot; → Food / Delivery, Personal.
        </p>
        <div className="tablewrap overflow-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
                <th className="text-left p-2">Keyword contains</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Subcategory</th>
                <th className="text-left p-2">Usage</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {(rules || []).map((r: any) => (
                <tr key={r.id} className="border-t border-[#edf0ee]">
                  <td className="p-2 font-mono">{r.keyword}</td>
                  <td className="p-2">{r.categories?.group_name}</td>
                  <td className="p-2">{r.subcategories?.name ?? "-"}</td>
                  <td className="p-2 capitalize">{r.personal_or_office ?? "-"}</td>
                  <td className="p-2">
                    <form action={deleteCategoryRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-[#b64b52] text-[11px]">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
              {(!rules || rules.length === 0) && (
                <tr><td colSpan={5} className="p-3 text-center text-muted">No rules yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <form action={createCategoryRule} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input name="keyword" required placeholder="Keyword e.g. SWIGGY" className="w-full min-w-0 border border-[#e3ddd7] rounded-xl p-2 text-xs" />
          <select name="category_id" required className="w-full min-w-0 border border-[#e3ddd7] rounded-xl p-2 text-xs">
            <option value="">Category…</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.group_name}</option>)}
          </select>
          <select name="subcategory_id" className="w-full min-w-0 border border-[#e3ddd7] rounded-xl p-2 text-xs">
            <option value="">Subcategory…</option>
            {(subcategories || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="personal_or_office" className="w-full min-w-0 border border-[#e3ddd7] rounded-xl p-2 text-xs">
            <option value="">Usage…</option>
            <option value="personal">Personal</option>
            <option value="office">Office</option>
          </select>
          <button type="submit" className="bg-navy text-white rounded-xl px-3 text-xs font-semibold">Add rule</button>
        </form>
      </section>

      <section className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
        <h3 className="text-sm font-bold text-navy mb-4">Audit history</h3>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Table</th>
              </tr>
            </thead>
            <tbody>
              {(auditLog || []).map((a) => (
                <tr key={a.id} className="border-t border-[#edf0ee]">
                  <td className="p-2">{formatDate(a.created_at)}</td>
                  <td className="p-2">{a.action}</td>
                  <td className="p-2">{a.entity_table}</td>
                </tr>
              ))}
              {(!auditLog || auditLog.length === 0) && (
                <tr><td colSpan={3} className="p-3 text-center text-muted">No audit events yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
