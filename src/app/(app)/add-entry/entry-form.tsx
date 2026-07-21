"use client";

import { useMemo, useState } from "react";
import { createTransaction } from "./actions";

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
  const [usageTouched, setUsageTouched] = useState(false);
  const [type, setType] = useState("expense");

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [subcategories, categoryId]
  );

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    if (usageTouched) return;
    const category = categories.find((c) => c.id === id);
    if (category?.default_personal_or_office) setUsage(category.default_personal_or_office);
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
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
          <select
            name="personal_or_office"
            required
            value={usage}
            onChange={(e) => {
              setUsage(e.target.value);
              setUsageTouched(true);
            }}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            <option value="personal">Personal</option>
            <option value="office">Office</option>
            <option value="shared">Shared</option>
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
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.group_name}
              </option>
            ))}
          </select>
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
          <label className="block text-xs text-muted mb-1.5">Reference</label>
          <input name="reference" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Reason / notes</label>
          <input name="narration" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
      </div>

      <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-3 text-sm">
        Save entry
      </button>
    </form>
  );
}
