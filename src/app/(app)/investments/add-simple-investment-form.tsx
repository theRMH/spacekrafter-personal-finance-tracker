"use client";

import { useState } from "react";
import { createInvestment } from "./actions";
import InvestmentCommonFields from "./investment-common-fields";

export default function AddSimpleInvestmentForm({
  accounts,
  investmentType,
  label,
  namePlaceholder,
}: {
  accounts: { id: string; name: string }[];
  investmentType: string;
  label: string;
  namePlaceholder: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e3ddd7] rounded-card shadow-sm px-6 py-4 max-w-3xl w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <span className="text-sm font-bold text-navy">+ Add {label}</span>
        <span className="text-muted text-xs">Expand</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy">Add {label}</h3>
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
        <input type="hidden" name="investment_type" value={investmentType} />
        <InvestmentCommonFields accounts={accounts} namePlaceholder={namePlaceholder} />
        <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
          + Add {label}
        </button>
      </form>
    </div>
  );
}
