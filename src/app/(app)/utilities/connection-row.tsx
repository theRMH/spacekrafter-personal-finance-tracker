"use client";

import { useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE } from "@/lib/commitments";
import { markCommitmentPaid } from "../insurance/actions";
import { updateUtilityConnection } from "./actions";

const UTILITY_TYPES = ["Electricity", "Gas/LPG", "Water", "Internet", "Mobile", "Cable/DTH", "Maintenance"];
const LOCATIONS = ["Home", "Office", "Additional Residence", "Rental Property", "Business Location"];

type Connection = {
  id: string;
  name: string;
  personal_or_office: string;
  expected_amount: number | null;
  due_date: string;
  status: string;
  provider: string | null;
  utility_details: { utility_type: string; location: string; consumer_number: string | null; billing_cycle: string | null } | null;
};

export default function ConnectionRow({ connection, accounts }: { connection: Connection; accounts: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const status = commitmentDisplayStatus(connection.status, connection.due_date);

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={8} className="p-4">
          <form
            action={async (formData) => {
              await updateUtilityConnection(formData);
              setEditing(false);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input type="hidden" name="id" value={connection.id} />
            <div>
              <label className="block text-[11px] text-muted mb-1">Connection name</label>
              <input name="name" required defaultValue={connection.name} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Utility type</label>
              <select name="utility_type" required defaultValue={connection.utility_details?.utility_type} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {UTILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Location</label>
              <select name="location" required defaultValue={connection.utility_details?.location} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Provider</label>
              <input name="provider" defaultValue={connection.provider ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Consumer number</label>
              <input name="consumer_number" defaultValue={connection.utility_details?.consumer_number ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Billing cycle</label>
              <select name="billing_cycle" defaultValue={connection.utility_details?.billing_cycle ?? "monthly"} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Expected amount (₹)</label>
              <input name="expected_amount" type="number" step="0.01" defaultValue={connection.expected_amount ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Due date</label>
              <input name="due_date" type="date" required defaultValue={connection.due_date} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
              <select name="personal_or_office" defaultValue={connection.personal_or_office} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
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
      <td className="p-3 font-semibold">{connection.name}</td>
      <td className="p-3">{connection.utility_details?.utility_type}</td>
      <td className="p-3">{connection.utility_details?.location}</td>
      <td className="p-3">{connection.provider ?? "-"}</td>
      <td className="p-3">{connection.expected_amount ? formatInr(connection.expected_amount) : "-"}</td>
      <td className="p-3">{formatDate(connection.due_date)}</td>
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
              <input type="hidden" name="id" value={connection.id} />
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
