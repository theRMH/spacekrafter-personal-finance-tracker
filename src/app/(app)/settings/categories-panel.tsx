"use client";

import { useMemo, useState } from "react";
import { createCategory, deleteCategory, createSubcategory, deleteSubcategory, updateCategoryCode } from "./actions";

type Subcategory = { id: string; name: string };
type Category = { id: string; group_name: string; code: string | null; subcategories: Subcategory[] };

export default function CategoriesPanel({ categories }: { categories: Category[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function saveCode(id: string) {
    setCodeBusy(true);
    setCodeError(null);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("code", codeValue);
      await updateCategoryCode(formData);
      setEditingCode(null);
    } catch (err: any) {
      setCodeError(err?.message || "Could not update code");
    } finally {
      setCodeBusy(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return categories;
    return categories
      .map((c) => ({
        ...c,
        subcategories: c.subcategories.filter((s) => s.name.toLowerCase().includes(query)),
      }))
      .filter((c) => c.group_name.toLowerCase().includes(query) || c.subcategories.length > 0);
  }, [categories, query]);

  function isOpen(id: string) {
    if (query) return true;
    return !!expanded[id];
  }

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories or subcategories…"
          className="border border-[#e3ddd7] rounded-xl p-2.5 text-xs min-w-[240px]"
        />
        <span className="text-[11px] text-muted">{categories.length} categories · {categories.reduce((n, c) => n + c.subcategories.length, 0)} subcategories</span>
      </div>

      <div className="grid gap-2 mb-6">
        {filtered.map((c) => {
          const open = isOpen(c.id);
          return (
            <div key={c.id} className="border border-[#e3ddd7] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-2 bg-[#faf9f7] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <span className={`text-[9px] text-muted transition-transform ${open ? "" : "-rotate-90"}`}>▾</span>
                  <span className="text-xs font-semibold text-navy truncate">{c.group_name}</span>
                  <span className="text-[10px] text-muted shrink-0">({c.subcategories.length})</span>
                </button>
                {editingCode === c.id ? (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                      className="border border-[#e3ddd7] rounded-lg p-1 text-[10px] w-20"
                    />
                    <button
                      type="button"
                      disabled={codeBusy || !codeValue.trim()}
                      onClick={() => saveCode(c.id)}
                      className="text-info text-[11px] font-semibold disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => { setEditingCode(null); setCodeError(null); }} className="text-muted text-[11px]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingCode(c.id); setCodeValue(c.code || ""); setCodeError(null); }}
                    title="Click to edit code"
                    className="shrink-0 text-[10px] font-mono bg-[#eef2ef] text-navy rounded-full px-2 py-1"
                  >
                    {c.code || "—"}
                  </button>
                )}
                <form
                  action={async (formData) => {
                    try {
                      await deleteCategory(formData);
                    } catch (err: any) {
                      alert(err?.message || "Could not delete category");
                    }
                  }}
                >
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-[#b64b52] text-[11px] font-semibold shrink-0">Delete</button>
                </form>
              </div>
              {editingCode === c.id && codeError && (
                <p className="text-[11px] text-[#b64b52] px-3 pt-1.5">{codeError}</p>
              )}
              {open && (
                <div className="p-3">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.subcategories.map((s) => (
                      <form key={s.id} action={deleteSubcategory} className="flex items-center gap-1 bg-[#eef2ef] rounded-full pl-2.5 pr-1 py-1">
                        <span className="text-[11px]">{s.name}</span>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="text-[#b64b52] text-[11px] px-1">×</button>
                      </form>
                    ))}
                    {c.subcategories.length === 0 && <span className="text-[11px] text-muted">No subcategories yet.</span>}
                  </div>
                  <form action={createSubcategory} className="flex flex-wrap gap-2">
                    <input type="hidden" name="category_id" value={c.id} />
                    <input name="name" required placeholder="New subcategory" className="flex-1 min-w-[140px] border border-[#e3ddd7] rounded-lg p-1.5 text-xs" />
                    <button type="submit" className="bg-navy text-white rounded-lg px-3 text-xs font-semibold">Add</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-muted p-3">No categories match &quot;{search}&quot;.</p>}
      </div>

      <form action={createCategory} className="flex flex-wrap gap-2 border-t border-[#edf0ee] pt-4">
        <input name="group_name" required placeholder="New category group" className="flex-1 min-w-[140px] border border-[#e3ddd7] rounded-xl p-2 text-xs" />
        <select name="default_personal_or_office" className="border border-[#e3ddd7] rounded-xl p-2 text-xs">
          <option value="">Default usage</option>
          <option value="personal">Personal</option>
          <option value="office">Office</option>
        </select>
        <button type="submit" className="bg-navy text-white rounded-xl px-3 text-xs font-semibold">+ Add category</button>
      </form>
    </div>
  );
}
