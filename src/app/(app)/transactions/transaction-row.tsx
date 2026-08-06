"use client";

import { useMemo, useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { categorizeTransaction, confirmProvisional, softDeleteTransaction, updateTransaction, undoTransactionEdit, redoTransactionEdit } from "./actions";
import { TYPE_LABELS, isInflow, typesForUsage } from "@/lib/transaction-types";
import { PAYMENT_MODES } from "@/lib/payment-mode";
import { categoriesForUsage } from "@/lib/category-filter";
import { createCategory } from "../settings/actions";

const TYPE_PILL: Record<string, string> = {
  income: "bg-[#e5f4eb] text-success",
  expense: "bg-[#fdeaea] text-[#b64b52]",
  transfer: "bg-[#e8eff8] text-info",
  investment: "bg-[#f3eee8] text-earth",
  advance_received: "bg-[#e5f4eb] text-success",
  advance_paid: "bg-[#fdeaea] text-[#b64b52]",
  loan_received: "bg-[#f0e9fb] text-[#6b4fa0]",
  loan_paid: "bg-[#f0e9fb] text-[#6b4fa0]",
};

const STATUS_PILL: Record<string, string> = {
  confirmed: "bg-[#e5f4eb] text-success",
  provisional: "bg-[#fff0dc] text-[#a9793b]",
  needs_review: "bg-[#fdeaea] text-[#b64b52]",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  provisional: "Unverified",
  needs_review: "Needs review",
};

type Tx = {
  id: string;
  transaction_date: string;
  amount: number;
  type: string;
  personal_or_office: string;
  payee_payer: string | null;
  narration: string | null;
  reference: string | null;
  status: string;
  source: string;
  account_id: string;
  payment_mode: string | null;
  accounts: { name: string } | null;
  categories: { id: string; group_name: string } | null;
  subcategories: { id: string; name: string } | null;
};

type Category = { id: string; group_name: string; default_personal_or_office: string | null };

export default function TransactionRow({
  tx,
  accounts,
  categories,
  subcategories,
  selected,
  onToggleSelect,
  onCategoryCreated,
}: {
  tx: Tx;
  accounts: { id: string; name: string }[];
  categories: Category[];
  subcategories: { id: string; name: string; category_id: string }[];
  selected?: boolean;
  onToggleSelect?: (id: string, checked: boolean) => void;
  onCategoryCreated?: (category: Category) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [usage, setUsage] = useState(tx.personal_or_office);
  const [type, setType] = useState(tx.type);
  const [categoryId, setCategoryId] = useState(tx.categories?.id || "");
  const [subcategoryId, setSubcategoryId] = useState(tx.subcategories?.id || "");
  const [lastAuditId, setLastAuditId] = useState<string | null>(null);
  const [lastState, setLastState] = useState<"edited" | "undone" | null>(null);

  const availableTypes = useMemo(
    () => (usage === "shared" ? [{ value: tx.type, label: TYPE_LABELS[tx.type] ?? tx.type }] : typesForUsage(usage)),
    [usage, tx.type]
  );
  const filteredSubcategories = useMemo(() => subcategories.filter((s) => s.category_id === categoryId), [subcategories, categoryId]);
  const filteredCategories = useMemo(() => categoriesForUsage(categories, usage, categoryId), [categories, usage, categoryId]);

  function changeUsage(next: string) {
    setUsage(next);
    if (next !== "shared" && !typesForUsage(next).some((t) => t.value === type)) setType("expense");
    const current = categories.find((c) => c.id === categoryId);
    if (next !== "shared" && current?.default_personal_or_office && current.default_personal_or_office !== next) {
      setCategoryId("");
      setSubcategoryId("");
    }
  }

  function changeCategory(next: string) {
    setCategoryId(next);
    setSubcategoryId("");
  }

  // Quick-categorise form for "needs review" rows — kept separate from the
  // full edit form's state above since it targets a different server action
  // (categorizeTransaction) and starts blank rather than from tx's values.
  const [reviewUsage, setReviewUsage] = useState(tx.personal_or_office === "office" ? "office" : "personal");
  const [reviewCategoryId, setReviewCategoryId] = useState("");
  const [reviewSubcategoryId, setReviewSubcategoryId] = useState("");
  const [addingReviewCategory, setAddingReviewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUsage, setNewCatUsage] = useState<"personal" | "office">("personal");
  const [newCatBusy, setNewCatBusy] = useState(false);

  const reviewCategories = useMemo(() => categoriesForUsage(categories, reviewUsage, reviewCategoryId), [categories, reviewUsage, reviewCategoryId]);
  const reviewSubcategories = useMemo(() => subcategories.filter((s) => s.category_id === reviewCategoryId), [subcategories, reviewCategoryId]);

  function changeReviewUsage(next: string) {
    setReviewUsage(next);
    const current = categories.find((c) => c.id === reviewCategoryId);
    if (current?.default_personal_or_office && current.default_personal_or_office !== next) {
      setReviewCategoryId("");
      setReviewSubcategoryId("");
    }
  }

  async function submitNewReviewCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatBusy(true);
    try {
      const formData = new FormData();
      formData.set("group_name", name);
      formData.set("default_personal_or_office", newCatUsage);
      const created = await createCategory(formData);
      onCategoryCreated?.(created as Category);
      setReviewCategoryId(created.id);
      setReviewSubcategoryId("");
      setAddingReviewCategory(false);
      setNewCatName("");
    } catch (err: any) {
      alert(err?.message || "Could not create category");
    } finally {
      setNewCatBusy(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={11} className="p-4">
          <form
            action={async (formData) => {
              const result = await updateTransaction(formData);
              setLastAuditId(result.auditId);
              setLastState("edited");
              setEditing(false);
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <input type="hidden" name="id" value={tx.id} />
            <div>
              <label className="block text-[11px] text-muted mb-1">Date</label>
              <input name="transaction_date" type="date" required defaultValue={tx.transaction_date} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Amount (₹)</label>
              <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={tx.amount} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Personal / Office</label>
              <select name="personal_or_office" required value={usage} onChange={(e) => changeUsage(e.target.value)} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="personal">Personal</option>
                <option value="office">Office</option>
                {usage === "shared" && <option value="shared">Shared (legacy)</option>}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Type</label>
              <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {availableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Account</label>
              <select name="account_id" required defaultValue={tx.account_id} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Category</label>
              <select name="category_id" value={categoryId} onChange={(e) => changeCategory(e.target.value)} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">Uncategorised</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.group_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Subcategory</label>
              <select name="subcategory_id" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">-</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Payee / Payer</label>
              <input name="payee_payer" defaultValue={tx.payee_payer ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Payment mode</label>
              <select name="payment_mode" defaultValue={tx.payment_mode ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">-</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Reference</label>
              <input name="reference" defaultValue={tx.reference ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-muted mb-1">Reason / notes</label>
              <input name="narration" defaultValue={tx.narration ?? ""} className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
            <div className="flex items-end gap-2 col-span-1 sm:col-span-4">
              <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">Save changes</button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted underline">Cancel</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[#edf0ee] align-top">
      <td className="p-3">
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) => onToggleSelect?.(tx.id, e.target.checked)}
          className="w-4 h-4"
        />
      </td>
      <td className="p-3 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
      <td className="p-3 whitespace-nowrap">{tx.accounts?.name ?? "-"}</td>
      <td className="p-3">{tx.payee_payer ?? "-"}</td>
      <td className="p-3">
        {tx.categories?.group_name ?? "Uncategorised"}
        {tx.subcategories?.name ? ` / ${tx.subcategories.name}` : ""}
      </td>
      <td className="p-3 whitespace-nowrap">{tx.payment_mode ?? "-"}</td>
      <td className="p-3 whitespace-nowrap">{tx.reference ?? "-"}</td>
      <td className="p-3 capitalize">{tx.personal_or_office}</td>
      <td className="p-3">
        <span className={`inline-flex rounded-full px-2 py-1 font-bold ${STATUS_PILL[tx.status] ?? ""}`}>
          {STATUS_LABEL[tx.status] ?? tx.status}
        </span>
        <div className="mt-1">
          <span className={`inline-flex rounded-full px-2 py-1 font-bold ${TYPE_PILL[tx.type] ?? ""}`}>
            {TYPE_LABELS[tx.type] ?? tx.type}
          </span>
        </div>
      </td>
      <td className={`p-3 text-right font-bold whitespace-nowrap ${isInflow(tx.type) ? "text-success" : "text-[#b64b52]"}`}>
        {isInflow(tx.type) ? "+" : "-"}
        {formatInr(tx.amount)}
      </td>
      <td className="p-3 min-w-[220px]">
        <div className="grid gap-1.5">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold text-left">
            Edit
          </button>
          {lastAuditId && (
            <div className="text-[11px] text-muted">
              {lastState === "edited" ? "Saved" : "Reverted"} ·{" "}
              <form
                action={async (formData) => {
                  if (lastState === "edited") {
                    await undoTransactionEdit(formData);
                    setLastState("undone");
                  } else {
                    await redoTransactionEdit(formData);
                    setLastState("edited");
                  }
                }}
                className="inline"
              >
                <input type="hidden" name="audit_id" value={lastAuditId} />
                <button type="submit" className="text-info font-semibold underline">
                  {lastState === "edited" ? "Undo" : "Redo"}
                </button>
              </form>
            </div>
          )}
          {tx.status === "needs_review" && (
            <form action={categorizeTransaction} className="grid gap-1.5">
              <input type="hidden" name="id" value={tx.id} />
              <select
                name="personal_or_office"
                required
                value={reviewUsage}
                onChange={(e) => changeReviewUsage(e.target.value)}
                className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
              >
                <option value="personal">Personal</option>
                <option value="office">Office</option>
              </select>

              {addingReviewCategory ? (
                <div className="flex flex-col gap-1">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name"
                    className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px] bg-white w-full"
                  />
                  <div className="flex gap-1">
                    <select
                      value={newCatUsage}
                      onChange={(e) => setNewCatUsage(e.target.value as "personal" | "office")}
                      className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px] bg-white"
                    >
                      <option value="personal">Home</option>
                      <option value="office">Office</option>
                    </select>
                    <button
                      type="button"
                      disabled={newCatBusy || !newCatName.trim()}
                      onClick={submitNewReviewCategory}
                      className="bg-navy text-white rounded-lg px-2 text-[11px] font-semibold disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingReviewCategory(false); setNewCatName(""); }}
                      className="text-muted text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  name="category_id"
                  required
                  value={reviewCategoryId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setAddingReviewCategory(true);
                      setNewCatName("");
                      setNewCatUsage(reviewUsage === "office" ? "office" : "personal");
                      return;
                    }
                    setReviewCategoryId(e.target.value);
                    setReviewSubcategoryId("");
                  }}
                  className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
                >
                  <option value="">Category…</option>
                  {reviewCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.group_name}</option>
                  ))}
                  <option value="__new__">+ Add new category…</option>
                </select>
              )}

              <select
                name="subcategory_id"
                value={reviewSubcategoryId}
                onChange={(e) => setReviewSubcategoryId(e.target.value)}
                disabled={!reviewCategoryId}
                className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]"
              >
                <option value="">Subcategory…</option>
                {reviewSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button type="submit" className="bg-navy text-white rounded-lg py-1.5 text-[11px] font-semibold">
                Confirm
              </button>
            </form>
          )}
          {tx.status === "provisional" && (
            <form action={confirmProvisional}>
              <input type="hidden" name="id" value={tx.id} />
              <button type="submit" className="bg-[#edf1f7] text-info rounded-lg px-2 py-1.5 text-[11px] font-semibold w-full">
                Confirm now
              </button>
            </form>
          )}
          {tx.status === "confirmed" && (
            <form action={softDeleteTransaction}>
              <input type="hidden" name="id" value={tx.id} />
              <button type="submit" className="bg-[#fdeaea] text-[#b64b52] rounded-lg px-2 py-1.5 text-[11px] font-semibold w-full">
                Delete
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
