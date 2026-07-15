"use client";

import { useState } from "react";
import { createAccount } from "./actions";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi_wallet", label: "UPI / Wallet" },
  { value: "cash", label: "Cash" },
  { value: "loan", label: "Loan Account" },
  { value: "other", label: "Other" },
];

export default function AddAccountForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add account</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add account</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <form
        action={async (formData) => {
          await createAccount(formData);
          setOpen(false);
        }}
        className="grid gap-4"
      >
        <div>
          <label className="block text-xs text-muted mb-1.5">Account name</label>
          <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="HDFC Personal" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Type</label>
            <select name="type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted mt-1">Don&apos;t see it? Pick &quot;Other&quot; and describe it in the account name above.</p>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
            <select name="personal_or_office" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
              <option value="personal">Personal</option>
              <option value="office">Office</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Opening balance (₹)</label>
          <input
            name="opening_balance"
            type="number"
            step="0.01"
            defaultValue={0}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          />
        </div>
        <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
          + Add account
        </button>
      </form>
    </div>
  );
}
