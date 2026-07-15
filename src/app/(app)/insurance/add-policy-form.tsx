"use client";

import { useState } from "react";
import { FREQUENCIES } from "@/lib/commitments";
import { createInsurancePolicy } from "./actions";

const INSURANCE_TYPES = ["Health", "Life", "Term", "Bike", "Car", "Property", "Business", "Personal Accident", "ULIP/Endowment"];

export default function AddPolicyForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-2xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add policy</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add policy</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <form
        action={async (formData) => {
          await createInsurancePolicy(formData);
          setOpen(false);
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs text-muted mb-1.5">Policy name</label>
          <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Family health cover" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Insurance type</label>
          <select name="insurance_type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            {INSURANCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Provider</label>
          <input name="provider" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Policy number</label>
          <input name="policy_number" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Insured person / asset</label>
          <input name="insured_person_or_asset" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Premium (₹)</label>
          <input name="expected_amount" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Frequency</label>
          <select name="frequency" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
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
          <label className="block text-xs text-muted mb-1.5">Linked account</label>
          <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {(accounts || []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Nominee</label>
          <input name="nominee" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs text-muted mb-1.5">Documents</label>
          <button type="button" disabled className="w-full border border-dashed border-[#aab0bf] rounded-xl p-2.5 text-xs text-muted bg-[#faf9f7] cursor-not-allowed">
            Add document — coming soon
          </button>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm w-full">
            + Add policy
          </button>
        </div>
      </form>
    </div>
  );
}
