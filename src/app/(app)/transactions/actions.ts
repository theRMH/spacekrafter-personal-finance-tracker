"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { typesForUsage } from "@/lib/transaction-types";
import { logAudit } from "@/lib/audit";

function revalidateAll() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/reports");
}

// Full edit for any transaction, confirmed/provisional/needs_review,
// manual or imported — corrects details without touching status/source,
// which stay owned by categorizeTransaction/confirmProvisional/import.
// Returns the audit_log id of this edit so the caller can offer an
// immediate "Undo" without a second round trip to look it up.
export async function updateTransaction(formData: FormData): Promise<{ auditId: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const transactionDate = String(formData.get("transaction_date") || "");
  const amount = Number(formData.get("amount") || 0);
  const type = String(formData.get("type") || "");
  const personalOrOffice = String(formData.get("personal_or_office") || "");
  const accountId = String(formData.get("account_id") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const subcategoryId = String(formData.get("subcategory_id") || "") || null;
  const payeePayer = String(formData.get("payee_payer") || "").trim() || null;
  const reference = String(formData.get("reference") || "").trim() || null;
  const narration = String(formData.get("narration") || "").trim() || null;
  const paymentMode = String(formData.get("payment_mode") || "").trim() || null;

  if (!transactionDate || !amount || amount <= 0 || !type || !personalOrOffice || !accountId) {
    throw new Error("Date, amount, type, usage and account are required");
  }
  // "shared" is a legacy usage value (no longer creatable) — don't force
  // old shared transactions through the Home/Office type restriction.
  if (personalOrOffice !== "shared" && !typesForUsage(personalOrOffice).some((t) => t.value === type)) {
    throw new Error(`"${type}" is not a valid type for ${personalOrOffice} entries`);
  }

  const { data: before } = await supabase.from("transactions").select("*").eq("id", id).eq("owner_id", user.id).single();
  if (!before) throw new Error("Transaction not found");

  const { data: after, error } = await supabase
    .from("transactions")
    .update({
      transaction_date: transactionDate,
      amount,
      type,
      personal_or_office: personalOrOffice,
      account_id: accountId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      payee_payer: payeePayer,
      reference,
      narration,
      payment_mode: paymentMode,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: logged } = await supabase
    .from("audit_log")
    .insert({ owner_id: user.id, actor_id: user.id, action: "edit_transaction", entity_table: "transactions", entity_id: id, before, after })
    .select("id")
    .single();

  revalidateAll();
  return { auditId: logged?.id ?? null };
}

// Reverts a transaction to the `before` snapshot of a specific edit —
// used both for the "Undo" shown right after saving an edit, and for
// reverting any past edit from the Audit Log itself.
export async function undoTransactionEdit(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const auditId = String(formData.get("audit_id"));
  const { data: entry } = await supabase.from("audit_log").select("*").eq("id", auditId).eq("owner_id", user.id).single();
  if (!entry || entry.entity_table !== "transactions" || entry.action !== "edit_transaction" || !entry.before) {
    throw new Error("Nothing to undo");
  }

  const snapshot = entry.before as Record<string, unknown>;
  const { error } = await supabase
    .from("transactions")
    .update({
      transaction_date: snapshot.transaction_date,
      amount: snapshot.amount,
      type: snapshot.type,
      personal_or_office: snapshot.personal_or_office,
      account_id: snapshot.account_id,
      category_id: snapshot.category_id,
      subcategory_id: snapshot.subcategory_id,
      payee_payer: snapshot.payee_payer,
      reference: snapshot.reference,
      narration: snapshot.narration,
      payment_mode: snapshot.payment_mode,
    })
    .eq("id", entry.entity_id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "undo_edit_transaction",
    entityTable: "transactions",
    entityId: entry.entity_id,
    before: entry.after,
    after: entry.before,
  });

  revalidateAll();
}

// Re-applies the `after` snapshot of the same edit — undoes the undo.
export async function redoTransactionEdit(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const auditId = String(formData.get("audit_id"));
  const { data: entry } = await supabase.from("audit_log").select("*").eq("id", auditId).eq("owner_id", user.id).single();
  if (!entry || entry.entity_table !== "transactions" || entry.action !== "edit_transaction" || !entry.after) {
    throw new Error("Nothing to redo");
  }

  const snapshot = entry.after as Record<string, unknown>;
  const { error } = await supabase
    .from("transactions")
    .update({
      transaction_date: snapshot.transaction_date,
      amount: snapshot.amount,
      type: snapshot.type,
      personal_or_office: snapshot.personal_or_office,
      account_id: snapshot.account_id,
      category_id: snapshot.category_id,
      subcategory_id: snapshot.subcategory_id,
      payee_payer: snapshot.payee_payer,
      reference: snapshot.reference,
      narration: snapshot.narration,
      payment_mode: snapshot.payment_mode,
    })
    .eq("id", entry.entity_id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "redo_edit_transaction",
    entityTable: "transactions",
    entityId: entry.entity_id,
    before: entry.before,
    after: entry.after,
  });

  revalidateAll();
}

export async function categorizeTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const categoryId = String(formData.get("category_id") || "") || null;
  const subcategoryId = String(formData.get("subcategory_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "");

  const { data: before } = await supabase.from("transactions").select("*").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      subcategory_id: subcategoryId,
      personal_or_office: personalOrOffice,
      status: "confirmed",
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "categorize_confirm",
    entityTable: "transactions",
    entityId: id,
    before,
    after: { category_id: categoryId, subcategory_id: subcategoryId, personal_or_office: personalOrOffice, status: "confirmed" },
  });

  revalidateAll();
}

export async function confirmProvisional(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { data: before } = await supabase.from("transactions").select("id, status").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase
    .from("transactions")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "confirm", entityTable: "transactions", entityId: id, before, after: { status: "confirmed" } });

  revalidateAll();
}

// Applies the same category/subcategory/usage change to many transactions
// at once — the main use case is clearing a pile of "needs review" rows
// after an import in one shot instead of one at a time. Logs a single
// summary entry rather than one per row, to stay cheap for large batches.
export async function bulkUpdateTransactions(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ids = String(formData.get("ids") || "").split(",").filter(Boolean);
  if (ids.length === 0) throw new Error("No transactions selected");

  const categoryId = String(formData.get("category_id") || "") || null;
  const subcategoryId = String(formData.get("subcategory_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "") || null;
  const markConfirmed = formData.get("mark_confirmed") === "on";

  const patch: Record<string, unknown> = {};
  if (formData.get("apply_category") === "on") {
    patch.category_id = categoryId;
    patch.subcategory_id = subcategoryId;
  }
  if (formData.get("apply_usage") === "on") patch.personal_or_office = personalOrOffice;
  if (markConfirmed) patch.status = "confirmed";

  if (Object.keys(patch).length === 0) throw new Error("Choose at least one field to apply");

  const { error } = await supabase.from("transactions").update(patch).in("id", ids).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "bulk_categorize",
    entityTable: "transactions",
    entityId: null,
    after: { transaction_ids: ids, patch },
  });

  revalidateAll();
}

export async function bulkDeleteTransactions(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ids = String(formData.get("ids") || "").split(",").filter(Boolean);
  if (ids.length === 0) throw new Error("No transactions selected");

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "bulk_delete",
    entityTable: "transactions",
    entityId: null,
    after: { transaction_ids: ids },
  });

  revalidateAll();
}

export async function softDeleteTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { data: before } = await supabase.from("transactions").select("*").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "soft_delete", entityTable: "transactions", entityId: id, before });

  revalidateAll();
}
