"use client";

import { useState } from "react";
import { createUtilityConnection } from "./actions";

const UTILITY_TYPES = ["Electricity", "Gas/LPG", "Water", "Internet", "Mobile", "Cable/DTH", "Maintenance"];
const LOCATIONS = ["Home", "Office", "Additional Residence", "Rental Property", "Business Location"];

export default function AddConnectionForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-2xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add connection</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add connection</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <form
        action={async (formData) => {
          await createUtilityConnection(formData);
          setOpen(false);
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs text-muted mb-1.5">Connection name</label>
          <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Home electricity" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Utility type</label>
          <select name="utility_type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            {UTILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Location</label>
          <select name="location" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Provider</label>
          <input name="provider" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Consumer number</label>
          <input name="consumer_number" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Billing cycle</label>
          <select name="billing_cycle" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Expected amount (₹)</label>
          <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Due date</label>
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
          <label className="block text-xs text-muted mb-1.5">Linked account</label>
          <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
            + Add connection
          </button>
        </div>
      </form>
    </div>
  );
}
