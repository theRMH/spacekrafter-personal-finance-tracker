"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { diffFields, entityLabel, ACTION_LABELS, ENTITY_TABLE_LABELS } from "@/lib/audit-display";
import { undoTransactionEdit } from "../transactions/actions";

type AuditEntry = {
  id: string;
  action: string;
  entity_table: string;
  entity_id: string | null;
  before: any;
  after: any;
  created_at: string;
  actorName: string;
};

export default function AuditRow({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const diff = diffFields(entry.before, entry.after);
  const label = entityLabel(entry.entity_table, entry.before, entry.after);
  const canRevert = entry.entity_table === "transactions" && entry.action === "edit_transaction" && entry.before;

  return (
    <>
      <tr className="border-t border-[#edf0ee]">
        <td className="p-2 whitespace-nowrap">{formatDate(entry.created_at)}</td>
        <td className="p-2">{entry.actorName}</td>
        <td className="p-2">{ACTION_LABELS[entry.action] ?? entry.action}</td>
        <td className="p-2">{ENTITY_TABLE_LABELS[entry.entity_table] ?? entry.entity_table}</td>
        <td className="p-2">{label ?? "-"}</td>
        <td className="p-2">
          <div className="flex items-center gap-3">
            {diff.length > 0 && (
              <button type="button" onClick={() => setOpen((v) => !v)} className="text-info text-[11px] font-semibold">
                {open ? "Hide" : "View"} changes
              </button>
            )}
            {canRevert && (
              <form
                action={async (formData) => {
                  await undoTransactionEdit(formData);
                }}
              >
                <input type="hidden" name="audit_id" value={entry.id} />
                <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">Revert</button>
              </form>
            )}
          </div>
        </td>
      </tr>
      {open && diff.length > 0 && (
        <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
          <td colSpan={6} className="p-3">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-muted uppercase text-[10px]">
                  <th className="text-left p-1">Field</th>
                  <th className="text-left p-1">Before</th>
                  <th className="text-left p-1">After</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((d) => (
                  <tr key={d.key}>
                    <td className="p-1 font-mono">{d.key}</td>
                    <td className="p-1 text-[#b64b52]">{String(d.from ?? "-")}</td>
                    <td className="p-1 text-success">{String(d.to ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
