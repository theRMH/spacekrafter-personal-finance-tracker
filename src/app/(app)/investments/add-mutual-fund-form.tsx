"use client";

import { useState } from "react";
import { createInvestment } from "./actions";
import InvestmentCommonFields from "./investment-common-fields";

export default function AddMutualFundForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-3xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add Mutual Fund</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add Mutual Fund</h3>
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
        <input type="hidden" name="investment_type" value="mutual_fund" />
        <InvestmentCommonFields accounts={accounts} namePlaceholder="Axis Bluechip Fund" />

        <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
          <legend className="text-xs font-bold text-navy px-1">Mutual Fund details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <input name="amc" placeholder="AMC / fund company" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="scheme_name" placeholder="Scheme name" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <select name="mf_category" className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
              <option value="">Category</option>
              <option value="debt">Debt</option>
              <option value="equity">Equity</option>
              <option value="hybrid">Hybrid</option>
              <option value="elss">ELSS</option>
            </select>
            <input name="folio_number" placeholder="Folio number" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="agent_advisor" placeholder="Agent / advisor" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <select name="investment_mode" className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
              <option value="">SIP or Lump sum</option>
              <option value="sip">SIP</option>
              <option value="lump_sum">Lump Sum</option>
            </select>
            <input name="sip_amount" type="number" step="0.01" placeholder="SIP amount" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="sip_frequency" placeholder="SIP frequency" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            <input name="units" type="number" step="0.0001" placeholder="Units" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
        </fieldset>

        <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
          + Add Mutual Fund
        </button>
      </form>
    </div>
  );
}
