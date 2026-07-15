"use client";

import { useState } from "react";
import { createInvestment } from "./actions";
import InvestmentCommonFields from "./investment-common-fields";

const TYPES = [
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "share", label: "Shares" },
  { value: "fd_rd", label: "Fixed Deposits / RD" },
  { value: "ppf_nps", label: "PPF / NPS" },
  { value: "gold_bond", label: "Gold / Bonds" },
  { value: "real_estate", label: "Real Estate" },
  { value: "business_capital", label: "Business Capital" },
  { value: "other", label: "Other" },
];

// Overview's catch-all form: only shows the Mutual Fund / Share fieldset that
// actually matches the selected type, instead of always showing both.
export default function AddInvestmentForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [investmentType, setInvestmentType] = useState("mutual_fund");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-3xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add investment</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-navy">Add investment</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
          Minimize
        </button>
      </div>
      <p className="text-xs text-muted mb-4">
        Tip: visiting a specific tab (Mutual Funds, Shares, ...) gives you a shorter, tailored form instead.
      </p>
      <form
        action={async (formData) => {
          await createInvestment(formData);
          setOpen(false);
        }}
        className="grid gap-4"
      >
        <div>
          <label className="block text-xs text-muted mb-1.5">Investment type</label>
          <select
            name="investment_type"
            required
            value={investmentType}
            onChange={(e) => setInvestmentType(e.target.value)}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <InvestmentCommonFields accounts={accounts} namePlaceholder="Axis Bluechip Fund / Reliance shares / FD #1" />

        {investmentType === "mutual_fund" && (
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
        )}

        {investmentType === "share" && (
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
        )}

        <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
          + Add investment
        </button>
      </form>
    </div>
  );
}
