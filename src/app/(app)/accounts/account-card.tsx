"use client";

import { useState } from "react";
import { formatInr } from "@/lib/format";
import { updateAccount, deleteAccount } from "./actions";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi_wallet", label: "UPI / Wallet" },
  { value: "cash", label: "Cash" },
  { value: "loan", label: "Loan Account" },
  { value: "other", label: "Other" },
];

type Account = {
  id: string;
  name: string;
  type: string;
  personal_or_office: string;
  opening_balance: number;
  reconciliation_status: string;
  last_imported_at: string | null;
};

export default function AccountCard({ account, calculated }: { account: Account; calculated: number }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
        <form
          action={async (formData) => {
            await updateAccount(formData);
            setEditing(false);
          }}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={account.id} />
          <div>
            <label className="block text-[11px] text-muted mb-1">Account name</label>
            <input name="name" required defaultValue={account.name} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Type</label>
            <select name="type" required defaultValue={account.type} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
            <select name="personal_or_office" required defaultValue={account.personal_or_office} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
              <option value="personal">Personal</option>
              <option value="office">Office</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-1">Opening balance (₹)</label>
            <input name="opening_balance" type="number" step="0.01" defaultValue={account.opening_balance} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">Save changes</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted underline">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
      <div className="flex justify-between items-start gap-2">
        <div className="text-[11px] uppercase tracking-wide text-muted">{account.name}</div>
        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold">
            Edit
          </button>
          <form action={deleteAccount}>
            <input type="hidden" name="id" value={account.id} />
            <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">Delete</button>
          </form>
        </div>
      </div>
      <div className="text-2xl font-extrabold text-navy mt-2">{formatInr(calculated)}</div>
      <div className="flex gap-2 mt-3 text-[11px]">
        <span className="rounded-full bg-[#edf1f7] text-info px-2 py-1 font-semibold">
          {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type}
        </span>
        <span className="rounded-full bg-[#eef2ef] text-[#53615a] px-2 py-1 font-semibold capitalize">
          {account.personal_or_office}
        </span>
      </div>
      <div className="text-[11px] text-muted mt-2 capitalize">
        {account.reconciliation_status.replace("_", " ")}
        {account.last_imported_at ? ` · last imported ${new Date(account.last_imported_at).toLocaleDateString("en-IN")}` : ""}
      </div>
    </div>
  );
}
