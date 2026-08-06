"use client";

import { useMemo, useState } from "react";
import { updateAccountantPermissions } from "./actions";

type Page = { href: string; label: string; group: string };

export default function PermissionChecklist({
  accountantId,
  accountantName,
  grantablePages,
  currentAllowed,
}: {
  accountantId: string;
  accountantName: string;
  grantablePages: Page[];
  currentAllowed: string[];
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(currentAllowed));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Page[]>();
    for (const p of grantablePages) {
      if (!byGroup.has(p.group)) byGroup.set(p.group, []);
      byGroup.get(p.group)!.push(p);
    }
    return Array.from(byGroup.entries());
  }, [grantablePages]);

  function toggle(href: string, next: boolean) {
    setSaved(false);
    setChecked((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(href);
      else copy.delete(href);
      return copy;
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-info text-[11px] font-semibold">
        Manage access ({currentAllowed.length} page{currentAllowed.length === 1 ? "" : "s"})
      </button>
    );
  }

  return (
    <div className="mt-3 border border-[#e3ddd7] rounded-xl p-4 bg-[#faf9f7]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-navy">Page access for {accountantName}</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-muted underline">
          Close
        </button>
      </div>
      <p className="text-[11px] text-muted mb-3">
        Whatever's checked, {accountantName.split(" ")[0]} can view and add on — never edit or delete, on any page, granted or not.
      </p>

      <form
        action={async (formData) => {
          setBusy(true);
          try {
            await updateAccountantPermissions(formData);
            setSaved(true);
          } finally {
            setBusy(false);
          }
        }}
        className="grid gap-4"
      >
        <input type="hidden" name="accountant_id" value={accountantId} />
        {grouped.map(([group, pages]) => (
          <div key={group}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1.5">{group}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {pages.map((p) => (
                <label key={p.href} className="flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    name={`page_${p.href}`}
                    checked={checked.has(p.href)}
                    onChange={(e) => toggle(p.href, e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50">
            {busy ? "Saving…" : "Save access"}
          </button>
          {saved && <span className="text-[11px] text-success font-semibold">Saved</span>}
        </div>
      </form>
    </div>
  );
}
