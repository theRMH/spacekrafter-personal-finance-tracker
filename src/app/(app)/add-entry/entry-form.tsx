"use client";

import { useMemo, useState } from "react";
import { createTransaction } from "./actions";
import { createCategory } from "../settings/actions";
import { PAYMENT_MODES } from "@/lib/payment-mode";
import { typesForUsage } from "@/lib/transaction-types";
import { categoriesForUsage } from "@/lib/category-filter";

type Account = { id: string; name: string };
type Category = { id: string; name: string; group_name: string; default_personal_or_office: string | null };
type Subcategory = { id: string; name: string; category_id: string };
type IncomeSource = { id: string; name: string };

export default function EntryForm({
  accounts,
  categories,
  subcategories,
  incomeSources,
}: {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  incomeSources: IncomeSource[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [usage, setUsage] = useState("personal");
  const [type, setType] = useState("expense");
  const [allCategories, setAllCategories] = useState<Category[]>(categories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUsage, setNewCatUsage] = useState<"personal" | "office">("personal");
  const [newCatBusy, setNewCatBusy] = useState(false);

  const filteredCategories = useMemo(() => categoriesForUsage(allCategories, usage, categoryId), [allCategories, usage, categoryId]);
  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [subcategories, categoryId]
  );

  const availableTypes = useMemo(() => typesForUsage(usage), [usage]);

  function handleCategoryChange(id: string) {
    if (id === "__new__") {
      setAddingCategory(true);
      setNewCatName("");
      setNewCatUsage(usage === "office" ? "office" : "personal");
      return;
    }
    setCategoryId(id);
  }

  // Home only supports Income/Expense — switching to it while an
  // Office-only type (e.g. Loan) is selected would submit an invalid combo.
  function changeUsage(next: string) {
    setUsage(next);
    if (!typesForUsage(next).some((t) => t.value === type)) setType("expense");
    const current = allCategories.find((c) => c.id === categoryId);
    if (current?.default_personal_or_office && current.default_personal_or_office !== next) setCategoryId("");
  }

  async function submitNewCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatBusy(true);
    try {
      const formData = new FormData();
      formData.set("group_name", name);
      formData.set("default_personal_or_office", newCatUsage);
      const created = await createCategory(formData);
      setAllCategories((prev) => [...prev, created as Category]);
      setCategoryId(created.id);
      setAddingCategory(false);
      setNewCatName("");
    } catch (err: any) {
      alert(err?.message || "Could not create category");
    } finally {
      setNewCatBusy(false);
    }
  }

  return (
    <form action={createTransaction} className="grid gap-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Date</label>
          <input
            name="transaction_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Amount (₹)</label>
          <input name="amount" type="number" step="0.01" min="0.01" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Type</label>
          <select
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            {availableTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
          <select
            name="personal_or_office"
            required
            value={usage}
            onChange={(e) => changeUsage(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            <option value="personal">Personal (Home)</option>
            <option value="office">Office</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Account</label>
        <select name="account_id" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {accounts.length === 0 && (
          <p className="text-xs text-[#a85f33] mt-1">
            No accounts yet — add one on the Accounts page first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Category</label>
          {addingCategory ? (
            <div className="flex flex-col gap-1.5">
              <input
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name"
                className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
              />
              <div className="flex gap-1.5">
                <select
                  value={newCatUsage}
                  onChange={(e) => setNewCatUsage(e.target.value as "personal" | "office")}
                  className="border border-[#e3ddd7] rounded-xl p-2.5"
                >
                  <option value="personal">Home</option>
                  <option value="office">Office</option>
                </select>
                <button
                  type="button"
                  disabled={newCatBusy || !newCatName.trim()}
                  onClick={submitNewCategory}
                  className="bg-navy text-white rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
                >
                  Add
                </button>
                <button type="button" onClick={() => { setAddingCategory(false); setNewCatName(""); }} className="text-muted text-xs">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <select
              name="category_id"
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
            >
              <option value="">Uncategorised</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.group_name}
                </option>
              ))}
              <option value="__new__">+ Add new category…</option>
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Subcategory</label>
          <select name="subcategory_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" disabled={!categoryId}>
            <option value="">-</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "income" && incomeSources.length > 0 && (
        <div>
          <label className="block text-xs text-muted mb-1.5">Income source (optional)</label>
          <select name="linked_commitment_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {incomeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted mt-1">Links this entry to a named source so it counts as Actual on Plans and Projections.</p>
        </div>
      )}

      <div>
        <label className="block text-xs text-muted mb-1.5">Payee / Payer</label>
        <input name="payee_payer" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Swiggy, client name, etc." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Payment mode (optional)</label>
          <select name="payment_mode" defaultValue="" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Reference</label>
          <input name="reference" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Reason / notes</label>
        <input name="narration" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
      </div>

      <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-3 text-sm">
        Save entry
      </button>
    </form>
  );
}
