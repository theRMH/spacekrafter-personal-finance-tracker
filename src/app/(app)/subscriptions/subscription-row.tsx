"use client";

import { useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus, STATUS_STYLE, FREQUENCIES } from "@/lib/commitments";
import { markCommitmentPaid } from "../insurance/actions";
import { cancelSubscription, restartSubscription, updateSubscription } from "./actions";

type Subscription = {
  id: string;
  name: string;
  personal_or_office: string;
  expected_amount: number | null;
  frequency: string;
  due_date: string;
  status: string;
  subscription_details: { category: string | null; auto_renew: boolean | null } | null;
};

export default function SubscriptionRow({ sub, accounts }: { sub: Subscription; accounts: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);
  const status = commitmentDisplayStatus(sub.status, sub.due_date);

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={8} className="p-4">
          <form
            action={async (formData) => {
              await updateSubscription(formData);
              setEditing(false);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input type="hidden" name="id" value={sub.id} />
            <div>
              <label className="block text-[11px] text-muted mb-1">Name</label>
              <input name="name" required defaultValue={sub.name} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Category</label>
              <input name="category" defaultValue={sub.subscription_details?.category ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Amount (₹)</label>
              <input name="expected_amount" type="number" step="0.01" defaultValue={sub.expected_amount ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Frequency</label>
              <select name="frequency" defaultValue={sub.frequency} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Renewal date</label>
              <input name="due_date" type="date" required defaultValue={sub.due_date} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
              <select name="personal_or_office" defaultValue={sub.personal_or_office} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="personal">Personal</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Linked account/card</label>
              <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">-</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="auto_renew" id={`auto_renew_${sub.id}`} defaultChecked={!!sub.subscription_details?.auto_renew} className="w-4 h-4" />
              <label htmlFor={`auto_renew_${sub.id}`} className="text-xs text-muted">Auto-renews</label>
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
      <td className="p-3 font-semibold">{sub.name}</td>
      <td className="p-3">{sub.subscription_details?.category ?? "-"}</td>
      <td className="p-3 capitalize">{sub.personal_or_office}</td>
      <td className="p-3">{sub.expected_amount ? formatInr(sub.expected_amount) : "-"}</td>
      <td className="p-3">{formatDate(sub.due_date)}</td>
      <td className="p-3">{sub.subscription_details?.auto_renew ? "Yes" : "No"}</td>
      <td className="p-3">
        <span className={`inline-flex rounded-full px-2 py-1 font-bold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
      </td>
      <td className="p-3 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold">
            Edit
          </button>
          {status !== "paid" && status !== "cancelled" && (
            <form action={markCommitmentPaid} className="inline-block">
              <input type="hidden" name="id" value={sub.id} />
              <button type="submit" className="text-info text-[11px] font-semibold">Mark paid</button>
            </form>
          )}
          {status !== "cancelled" && (
            <form action={cancelSubscription} className="inline-block">
              <input type="hidden" name="id" value={sub.id} />
              <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">Cancel</button>
            </form>
          )}
          {status === "cancelled" && (
            <form action={restartSubscription} className="flex gap-1.5 items-center">
              <input type="hidden" name="id" value={sub.id} />
              <input type="date" name="restart_date" required className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]" />
              <button type="submit" className="bg-[#edf1f7] text-info rounded-lg px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap">
                Restart
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
