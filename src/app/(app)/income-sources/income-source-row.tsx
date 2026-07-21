"use client";

import { useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE, FREQUENCIES } from "@/lib/commitments";
import { markIncomeReceived, updateIncomeSource } from "./actions";

const STATUS_LABEL: Record<string, string> = { paid: "Received" };
const INCOME_TYPES = ["Rental", "Salary", "Business Revenue", "Investment Payout", "Service / AMC Revenue", "Other"];

type Source = {
  id: string;
  name: string;
  personal_or_office: string;
  expected_amount: number | null;
  frequency: string;
  due_date: string;
  status: string;
  income_source_details: { income_type: string; payer_or_property: string | null; notes: string | null } | null;
};

export default function IncomeSourceRow({ source, accounts }: { source: Source; accounts: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const status = commitmentDisplayStatus(source.status, source.due_date);

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={7} className="p-4">
          <form
            action={async (formData) => {
              await updateIncomeSource(formData);
              setEditing(false);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input type="hidden" name="id" value={source.id} />
            <div>
              <label className="block text-[11px] text-muted mb-1">Source name</label>
              <input name="name" required defaultValue={source.name} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Income type</label>
              <select name="income_type" required defaultValue={source.income_source_details?.income_type} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {INCOME_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Payer / property</label>
              <input name="payer_or_property" defaultValue={source.income_source_details?.payer_or_property ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Expected amount (₹)</label>
              <input name="expected_amount" type="number" step="0.01" defaultValue={source.expected_amount ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Frequency</label>
              <select name="frequency" defaultValue={source.frequency} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Next expected date</label>
              <input name="due_date" type="date" required defaultValue={source.due_date} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
              <select name="personal_or_office" defaultValue={source.personal_or_office} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="personal">Personal</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Linked account</label>
              <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">-</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Notes</label>
              <input name="notes" defaultValue={source.income_source_details?.notes ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div className="flex items-end gap-2 col-span-1 sm:col-span-3">
              <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">
                Save changes
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted underline">
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[#edf0ee]">
      <td className="p-3 font-semibold">{source.name}</td>
      <td className="p-3">{source.income_source_details?.income_type}</td>
      <td className="p-3">{source.income_source_details?.payer_or_property ?? "-"}</td>
      <td className="p-3">{source.expected_amount ? formatInr(source.expected_amount) : "-"}</td>
      <td className="p-3">{formatDate(source.due_date)}</td>
      <td className="p-3">
        <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold">
            Edit
          </button>
          {status !== "paid" && (
            <form action={markIncomeReceived}>
              <input type="hidden" name="id" value={source.id} />
              <button type="submit" className="text-info text-[11px] font-semibold">
                Mark received
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
