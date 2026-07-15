"use client";

import { useState } from "react";
import { createInvestment } from "./actions";
import InvestmentCommonFields from "./investment-common-fields";

export default function AddShareForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-3xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add Share</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add Share</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <form
        action={async (formData) => {
          await createInvestment(formData);
          setOpen(false);
        }}
        className="grid gap-4"
      >
        <input type="hidden" name="investment_type" value="share" />
        {/* "Name" here doubles as the company name — the Share fields below don't repeat it. */}
        <InvestmentCommonFields accounts={accounts} namePlaceholder="Reliance Industries" />

        <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
          <legend className="text-xs font-bold text-navy px-1">Share details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <input name="symbol" placeholder="Symbol" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="sector" placeholder="Sector" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="broker" placeholder="Broker" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="demat_account" placeholder="Demat account" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="quantity" type="number" step="0.0001" placeholder="Quantity" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="average_purchase_price" type="number" step="0.01" placeholder="Average purchase price" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
        </fieldset>

        <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
          + Add Share
        </button>
      </form>
    </div>
  );
}
