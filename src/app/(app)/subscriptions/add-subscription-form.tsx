"use client";

import { useState } from "react";
import { createSubscription } from "./actions";

export default function AddSubscriptionForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-2xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add subscription</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add subscription</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <form
        action={async (formData) => {
          await createSubscription(formData);
          setOpen(false);
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs text-muted mb-1.5">Name</label>
          <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Netflix" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Category</label>
          <input name="category" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Entertainment" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Amount (₹)</label>
          <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Frequency</label>
          <select name="frequency" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Renewal date</label>
          <input name="due_date" type="date" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Personal / Office</label>
          <select name="personal_or_office" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="personal">Personal</option>
            <option value="office">Office</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Linked account/card</label>
          <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input type="checkbox" name="auto_renew" id="auto_renew" className="w-4 h-4" />
          <label htmlFor="auto_renew" className="text-xs text-muted">Auto-renews</label>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
            + Add subscription
          </button>
        </div>
      </form>
    </div>
  );
}
