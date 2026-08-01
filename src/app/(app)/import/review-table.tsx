"use client";

import { useState } from "react";
import type { PreviewRow } from "./actions";

type Category = { id: string; group_name: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

type Props = {
  rows: PreviewRow[];
  categories: Category[];
  subcategories: Subcategory[];
  onConfirm: (rows: PreviewRow[]) => void;
  onBack: () => void;
  busy: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-50 text-green-700",
  needs_review: "bg-amber-50 text-amber-700",
  duplicate: "bg-gray-100 text-gray-400",
  transfer: "bg-blue-50 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Auto-categorised",
  needs_review: "Needs review",
  duplicate: "Duplicate",
  transfer: "Transfer",
};

function fmt(amount: number, type: string) {
  const sign = type === "expense" ? "−" : "+";
  return `${sign}₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function ReviewTable({ rows, categories, subcategories, onConfirm, onBack, busy }: Props) {
  const [editableRows, setEditableRows] = useState<PreviewRow[]>(rows);

  function update(index: number, patch: Partial<PreviewRow>) {
    setEditableRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function remove(index: number) {
    setEditableRows((prev) => prev.filter((_, i) => i !== index));
  }

  const active = editableRows.filter((r) => r.status !== "duplicate");
  const dupes = editableRows.filter((r) => r.status === "duplicate").length;
  const needsReview = active.filter((r) => r.status === "needs_review").length;

  return (
    <div className="grid gap-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="bg-[#f0f3f8] text-[#394a68] rounded-lg px-3 py-1.5 font-medium">
          {active.length} rows to import
        </span>
        {needsReview > 0 && (
          <span className="bg-amber-50 text-amber-700 rounded-lg px-3 py-1.5 font-medium">
            {needsReview} need review
          </span>
        )}
        {dupes > 0 && (
          <span className="bg-gray-100 text-gray-500 rounded-lg px-3 py-1.5 font-medium">
            {dupes} duplicates skipped
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border border-[#e3ddd7] rounded-xl overflow-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Narration</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Subcategory</th>
              <th className="text-left p-3">Personal / Office</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {editableRows.map((row, i) => {
              const isDupe = row.status === "duplicate";
              const subsForCategory = subcategories.filter((s) => s.category_id === row.category_id);

              return (
                <tr
                  key={i}
                  className={`border-t border-[#edf0ee] ${isDupe ? "opacity-40" : ""}`}
                >
                  <td className="p-3 whitespace-nowrap">{row.date}</td>
                  <td className="p-3 max-w-[220px] truncate" title={row.narration}>{row.narration}</td>
                  <td className={`p-3 text-right font-medium whitespace-nowrap ${row.type === "income" ? "text-green-700" : "text-red-600"}`}>
                    {fmt(row.amount, row.type)}
                  </td>

                  {/* Category */}
                  <td className="p-3">
                    {isDupe ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <select
                        value={row.category_id || ""}
                        onChange={(e) => {
                          update(i, { category_id: e.target.value || null, subcategory_id: null, status: "confirmed" });
                        }}
                        className="border border-[#e3ddd7] rounded-lg p-1.5 text-xs bg-white w-full"
                      >
                        <option value="">— None —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.group_name}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Subcategory */}
                  <td className="p-3">
                    {isDupe || !row.category_id ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <select
                        value={row.subcategory_id || ""}
                        onChange={(e) => update(i, { subcategory_id: e.target.value || null })}
                        className="border border-[#e3ddd7] rounded-lg p-1.5 text-xs bg-white w-full"
                      >
                        <option value="">— None —</option>
                        {subsForCategory.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Personal / Office */}
                  <td className="p-3">
                    {isDupe ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <select
                        value={row.personal_or_office}
                        onChange={(e) => update(i, { personal_or_office: e.target.value as PreviewRow["personal_or_office"] })}
                        className="border border-[#e3ddd7] rounded-lg p-1.5 text-xs bg-white"
                      >
                        <option value="personal">Personal</option>
                        <option value="office">Office</option>
                        <option value="shared">Shared</option>
                      </select>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[row.status] || ""}`}>
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </td>

                  {/* Remove */}
                  <td className="p-3 text-center">
                    {!isDupe && (
                      <button
                        onClick={() => remove(i)}
                        className="text-muted hover:text-red-500 text-base leading-none"
                        title="Remove this row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="border border-[#e3ddd7] text-navy font-semibold rounded-xl py-3 px-6 text-sm disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(editableRows)}
          disabled={busy || active.length === 0}
          className="flex-1 bg-navy text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
        >
          {busy ? "Importing…" : `Confirm & import ${active.length} row${active.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
