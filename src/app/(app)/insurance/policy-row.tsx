"use client";

import { useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE, FREQUENCIES } from "@/lib/commitments";
import { markCommitmentPaid, updateInsurancePolicy } from "./actions";

const INSURANCE_TYPES = ["Health", "Life", "Term", "Bike", "Car", "Property", "Business", "Personal Accident", "ULIP/Endowment"];

type Policy = {
  id: string;
  name: string;
  personal_or_office: string;
  expected_amount: number | null;
  frequency: string;
  due_date: string;
  status: string;
  provider: string | null;
  insurance_details: { insurance_type: string; policy_number: string | null; insured_person_or_asset: string | null; nominee: string | null } | null;
};

export default function PolicyRow({ policy, accounts }: { policy: Policy; accounts: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const status = commitmentDisplayStatus(policy.status, policy.due_date);

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={8} className="p-4">
          <form
            action={async (formData) => {
              await updateInsurancePolicy(formData);
              setEditing(false);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input type="hidden" name="id" value={policy.id} />
            <div>
              <label className="block text-[11px] text-muted mb-1">Policy name</label>
              <input name="name" required defaultValue={policy.name} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Insurance type</label>
              <select name="insurance_type" required defaultValue={policy.insurance_details?.insurance_type} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Provider</label>
              <input name="provider" defaultValue={policy.provider ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Policy number</label>
              <input name="policy_number" defaultValue={policy.insurance_details?.policy_number ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Insured person / asset</label>
              <input name="insured_person_or_asset" defaultValue={policy.insurance_details?.insured_person_or_asset ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Premium (₹)</label>
              <input name="expected_amount" type="number" step="0.01" defaultValue={policy.expected_amount ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Frequency</label>
              <select name="frequency" defaultValue={policy.frequency} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Renewal date</label>
              <input name="due_date" type="date" required defaultValue={policy.due_date} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
              <select name="personal_or_office" defaultValue={policy.personal_or_office} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
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
              <label className="block text-[11px] text-muted mb-1">Nominee</label>
              <input name="nominee" defaultValue={policy.insurance_details?.nominee ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
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
      <td className="p-3 font-semibold">{policy.name}</td>
      <td className="p-3">{policy.insurance_details?.insurance_type}</td>
      <td className="p-3">{policy.insurance_details?.insured_person_or_asset ?? "-"}</td>
      <td className="p-3">{policy.provider ?? "-"}</td>
      <td className="p-3">{policy.expected_amount ? formatInr(policy.expected_amount) : "-"}</td>
      <td className="p-3">{formatDate(policy.due_date)}</td>
      <td className="p-3">
        <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold">
            Edit
          </button>
          {status !== "paid" && (
            <form action={markCommitmentPaid}>
              <input type="hidden" name="id" value={policy.id} />
              <button type="submit" className="text-info text-[11px] font-semibold">
                Mark paid
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
