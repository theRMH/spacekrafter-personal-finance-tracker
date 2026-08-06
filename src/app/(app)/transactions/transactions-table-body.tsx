"use client";

import { useMemo, useState } from "react";
import TransactionRow from "./transaction-row";
import { bulkUpdateTransactions, bulkDeleteTransactions } from "./actions";
import { createCategory } from "../settings/actions";
import { categoriesForUsage } from "@/lib/category-filter";

type Tx = { id: string; [key: string]: any };
type Category = { id: string; group_name: string; default_personal_or_office: string | null };

export default function TransactionsTableBody({
  transactions,
  accounts,
  categories,
  subcategories,
}: {
  transactions: Tx[];
  accounts: { id: string; name: string }[];
  categories: Category[];
  subcategories: { id: string; name: string; category_id: string }[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  // Local copy so a category added inline from any row or the bulk toolbar
  // shows up immediately everywhere on this page without a full reload.
  const [allCategories, setAllCategories] = useState<Category[]>(categories);
  const [bulkUsage, setBulkUsage] = useState<"personal" | "office">("personal");
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState("");
  const [addingBulkCategory, setAddingBulkCategory] = useState(false);
  const [newBulkCatName, setNewBulkCatName] = useState("");
  const [newBulkCatUsage, setNewBulkCatUsage] = useState<"personal" | "office">("personal");
  const [newBulkCatBusy, setNewBulkCatBusy] = useState(false);

  const bulkCategories = useMemo(() => categoriesForUsage(allCategories, bulkUsage, bulkCategoryId), [allCategories, bulkUsage, bulkCategoryId]);
  const bulkSubcategories = useMemo(() => subcategories.filter((s) => s.category_id === bulkCategoryId), [subcategories, bulkCategoryId]);

  function addCategory(category: Category) {
    setAllCategories((prev) => [...prev, category]);
  }

  async function submitNewBulkCategory() {
    const name = newBulkCatName.trim();
    if (!name) return;
    setNewBulkCatBusy(true);
    try {
      const formData = new FormData();
      formData.set("group_name", name);
      formData.set("default_personal_or_office", newBulkCatUsage);
      const created = await createCategory(formData);
      addCategory(created as Category);
      setBulkCategoryId(created.id);
      setBulkSubcategoryId("");
      setAddingBulkCategory(false);
      setNewBulkCatName("");
    } catch (err: any) {
      alert(err?.message || "Could not create category");
    } finally {
      setNewBulkCatBusy(false);
    }
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(transactions.map((t) => t.id)) : new Set());
  }

  const allSelected = transactions.length > 0 && selected.size === transactions.length;
  const idsCsv = Array.from(selected).join(",");

  return (
    <>
      <thead>
        <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
          <th className="text-left p-3">
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="w-4 h-4" />
          </th>
          <th className="text-left p-3">Date</th>
          <th className="text-left p-3">Account</th>
          <th className="text-left p-3">Payee / Payer</th>
          <th className="text-left p-3">Category</th>
          <th className="text-left p-3">Mode</th>
          <th className="text-left p-3">Reference</th>
          <th className="text-left p-3">Usage</th>
          <th className="text-left p-3">Status</th>
          <th className="text-right p-3">Amount</th>
          <th className="text-left p-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {selected.size > 0 && (
          <tr className="border-t border-[#edf0ee] bg-[#eef2fb]">
            <td colSpan={11} className="p-3">
              <form
                action={async (formData) => {
                  setBusy(true);
                  try {
                    await bulkUpdateTransactions(formData);
                    setSelected(new Set());
                  } finally {
                    setBusy(false);
                  }
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="ids" value={idsCsv} />
                <span className="text-xs font-semibold text-navy self-center mr-1">{selected.size} selected</span>

                <label className="flex items-center gap-1 text-[11px] text-muted">
                  <input type="checkbox" name="apply_usage" className="w-3.5 h-3.5" /> Usage
                </label>
                <select
                  name="personal_or_office"
                  value={bulkUsage}
                  onChange={(e) => {
                    const next = e.target.value as "personal" | "office";
                    setBulkUsage(next);
                    const current = allCategories.find((c) => c.id === bulkCategoryId);
                    if (current?.default_personal_or_office && current.default_personal_or_office !== next) {
                      setBulkCategoryId("");
                      setBulkSubcategoryId("");
                    }
                  }}
                  className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
                >
                  <option value="personal">Personal</option>
                  <option value="office">Office</option>
                </select>

                <label className="flex items-center gap-1 text-[11px] text-muted ml-2">
                  <input type="checkbox" name="apply_category" className="w-3.5 h-3.5" /> Category
                </label>
                {addingBulkCategory ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={newBulkCatName}
                      onChange={(e) => setNewBulkCatName(e.target.value)}
                      placeholder="New category name"
                      className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px] bg-white"
                    />
                    <select
                      value={newBulkCatUsage}
                      onChange={(e) => setNewBulkCatUsage(e.target.value as "personal" | "office")}
                      className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px] bg-white"
                    >
                      <option value="personal">Home</option>
                      <option value="office">Office</option>
                    </select>
                    <button
                      type="button"
                      disabled={newBulkCatBusy || !newBulkCatName.trim()}
                      onClick={submitNewBulkCategory}
                      className="bg-navy text-white rounded-lg px-2 text-[11px] font-semibold disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button type="button" onClick={() => { setAddingBulkCategory(false); setNewBulkCatName(""); }} className="text-muted text-[11px]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    name="category_id"
                    value={bulkCategoryId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setAddingBulkCategory(true);
                        setNewBulkCatName("");
                        setNewBulkCatUsage(bulkUsage);
                        return;
                      }
                      setBulkCategoryId(e.target.value);
                      setBulkSubcategoryId("");
                    }}
                    className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
                  >
                    <option value="">Uncategorised</option>
                    {bulkCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.group_name}</option>
                    ))}
                    <option value="__new__">+ Add new category…</option>
                  </select>
                )}
                <select
                  name="subcategory_id"
                  value={bulkSubcategoryId}
                  onChange={(e) => setBulkSubcategoryId(e.target.value)}
                  disabled={!bulkCategoryId}
                  className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
                >
                  <option value="">-</option>
                  {bulkSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1 text-[11px] text-muted ml-2">
                  <input type="checkbox" name="mark_confirmed" className="w-3.5 h-3.5" /> Mark confirmed
                </label>

                <button type="submit" disabled={busy} className="bg-navy text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50">
                  Apply to {selected.size}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const fd = new FormData();
                      fd.set("ids", idsCsv);
                      await bulkDeleteTransactions(fd);
                      setSelected(new Set());
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="bg-[#fdeaea] text-[#b64b52] rounded-lg px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                >
                  Delete {selected.size}
                </button>
              </form>
            </td>
          </tr>
        )}

        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx as any}
            accounts={accounts}
            categories={allCategories}
            subcategories={subcategories}
            selected={selected.has(tx.id)}
            onToggleSelect={toggle}
            onCategoryCreated={addCategory}
          />
        ))}
        {transactions.length === 0 && (
          <tr>
            <td colSpan={11} className="p-6 text-center text-muted">
              No transactions match this filter.
            </td>
          </tr>
        )}
      </tbody>
    </>
  );
}
