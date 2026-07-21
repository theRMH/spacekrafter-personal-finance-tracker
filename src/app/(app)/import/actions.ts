"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/auth";

export type ImportMapping = {
  date: string;
  narration: string;
  debit?: string;
  credit?: string;
  amount?: string;
  reference?: string;
};

function parseAmount(v: string | undefined) {
  if (!v) return 0;
  const cleaned = String(v).replace(/[,₹\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(v: string | undefined) {
  const raw = (v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

function daysBetween(a: string, b: string) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export async function processImport(
  accountId: string,
  mapping: ImportMapping,
  rows: Record<string, string>[],
  fileName: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ownerId = await getEffectiveOwnerId(supabase, user.id);

  await supabase.from("import_mappings").upsert(
    { owner_id: ownerId, account_id: accountId, label: "last_used", column_mapping: mapping },
    { onConflict: "owner_id,account_id,label" }
  );

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id, fingerprint, status, amount, type, transaction_date, account_id")
    .is("deleted_at", null);
  const allTx = existingTx || [];
  const existingFingerprints = new Set(
    allTx.filter((t) => t.account_id === accountId && t.fingerprint).map((t) => t.fingerprint as string)
  );

  const { data: rules } = await supabase
    .from("category_rules")
    .select("keyword, account_id, category_id, subcategory_id, personal_or_office")
    .order("priority", { ascending: false });

  const { data: pastConfirmed } = await supabase
    .from("transactions")
    .select("payee_payer, category_id, subcategory_id, personal_or_office")
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .not("category_id", "is", null)
    .not("payee_payer", "is", null);

  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, expected_amount, due_date, reminder_lead_days, personal_or_office")
    .eq("linked_account_id", accountId)
    .in("status", ["upcoming", "due", "overdue"]);

  const usedCommitmentIds = new Set<string>();
  const usedProvisionalIds = new Set<string>();
  const usedTransferIds = new Set<string>();

  let accepted = 0,
    duplicates = 0,
    transfers = 0,
    matched = 0,
    unknown = 0,
    rejected = 0;

  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({ owner_id: ownerId, account_id: accountId, file_name: fileName, column_mapping: mapping, total_rows: rows.length })
    .select()
    .single();
  if (batchErr) throw new Error(batchErr.message);

  for (const row of rows) {
    const date = parseDate(mapping.date ? row[mapping.date] : undefined);
    const narration = (mapping.narration ? row[mapping.narration] : "")?.trim() || "";
    const reference = (mapping.reference ? row[mapping.reference] : "")?.trim() || "";

    let amount = 0;
    let type: "income" | "expense" = "expense";
    if (mapping.amount) {
      const raw = parseAmount(row[mapping.amount]);
      type = raw < 0 ? "expense" : "income";
      amount = Math.abs(raw);
    } else {
      const debit = mapping.debit ? parseAmount(row[mapping.debit]) : 0;
      const credit = mapping.credit ? parseAmount(row[mapping.credit]) : 0;
      if (debit > 0) {
        amount = debit;
        type = "expense";
      } else {
        amount = credit;
        type = "income";
      }
    }

    if (!date || !amount) {
      rejected++;
      continue;
    }

    const fingerprint = `${date}|${amount}|${(reference || narration).toLowerCase().replace(/\s+/g, "")}`;
    if (existingFingerprints.has(fingerprint)) {
      duplicates++;
      continue;
    }
    existingFingerprints.add(fingerprint);

    // 1. Merge into a matching provisional manual entry on the same account (BR-03/BR-07).
    const provisionalMatch = allTx.find(
      (t) =>
        !usedProvisionalIds.has(t.id) &&
        t.account_id === accountId &&
        t.status === "provisional" &&
        t.type === type &&
        Math.abs(Number(t.amount) - amount) < 1 &&
        daysBetween(t.transaction_date, date) <= 3
    );

    if (provisionalMatch) {
      usedProvisionalIds.add(provisionalMatch.id);
      await supabase
        .from("transactions")
        .update({ status: "confirmed", reference: reference || null, narration: narration || null, import_batch_id: batch.id, fingerprint })
        .eq("id", provisionalMatch.id);
      accepted++;
      matched++;
      continue;
    }

    // 2. Internal transfer detection against another owned account.
    const oppositeType = type === "income" ? "expense" : "income";
    const transferMatch = allTx.find(
      (t) =>
        !usedTransferIds.has(t.id) &&
        t.account_id !== accountId &&
        (t.status === "confirmed" || t.status === "provisional") &&
        t.type === oppositeType &&
        Math.abs(Number(t.amount) - amount) < 1 &&
        daysBetween(t.transaction_date, date) <= 3
    );

    let finalType: string = type;
    let linkedCommitmentId: string | null = null;
    let categoryId: string | null = null;
    let subcategoryId: string | null = null;
    let personalOrOffice = "personal";
    let status: "confirmed" | "needs_review" = "needs_review";

    if (transferMatch) {
      usedTransferIds.add(transferMatch.id);
      finalType = "transfer";
      status = "confirmed";
      transfers++;
    } else {
      const commitmentMatch = (commitments || []).find(
        (c) =>
          !usedCommitmentIds.has(c.id) &&
          c.expected_amount &&
          Math.abs(Number(c.expected_amount) - amount) <= Math.max(5, Number(c.expected_amount) * 0.05) &&
          daysBetween(c.due_date, date) <= (c.reminder_lead_days || 14)
      );

      if (commitmentMatch) {
        usedCommitmentIds.add(commitmentMatch.id);
        linkedCommitmentId = commitmentMatch.id;
        personalOrOffice = commitmentMatch.personal_or_office;
        status = "confirmed";
        matched++;
      } else {
        const upperNarration = narration.toUpperCase();
        const rule = (rules || []).find((r) => upperNarration.includes(r.keyword) && (!r.account_id || r.account_id === accountId));
        if (rule) {
          categoryId = rule.category_id;
          subcategoryId = rule.subcategory_id;
          personalOrOffice = rule.personal_or_office || "personal";
          status = "confirmed";
        } else {
          const hist = (pastConfirmed || []).find(
            (p) => p.payee_payer && upperNarration.includes(String(p.payee_payer).toUpperCase())
          );
          if (hist) {
            categoryId = hist.category_id;
            subcategoryId = hist.subcategory_id;
            personalOrOffice = hist.personal_or_office;
            status = "confirmed";
          } else {
            status = "needs_review";
            unknown++;
          }
        }
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("transactions")
      .insert({
        owner_id: ownerId,
        transaction_date: date,
        amount,
        type: finalType,
        personal_or_office: personalOrOffice,
        account_id: accountId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        payee_payer: narration || null,
        reference: reference || null,
        narration: narration || null,
        status,
        source: "imported",
        import_batch_id: batch.id,
        fingerprint,
        linked_commitment_id: linkedCommitmentId,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      rejected++;
      continue;
    }
    accepted++;

    if (transferMatch) {
      await supabase.from("transactions").update({ type: "transfer", status: "confirmed", transfer_pair_id: inserted.id }).eq("id", transferMatch.id);
      await supabase.from("transactions").update({ transfer_pair_id: transferMatch.id }).eq("id", inserted.id);
    }
    if (linkedCommitmentId) {
      await supabase.from("commitments").update({ status: "paid", linked_transaction_id: inserted.id }).eq("id", linkedCommitmentId);
    }
  }

  await supabase.from("import_batches").update({ accepted, duplicates, transfers, matched, unknown, rejected }).eq("id", batch.id);
  await supabase.from("accounts").update({ last_imported_at: new Date().toISOString(), reconciliation_status: "in_progress" }).eq("id", accountId);

  await supabase.from("audit_log").insert({
    owner_id: ownerId,
    actor_id: user.id,
    action: "import_statement",
    entity_table: "import_batches",
    entity_id: batch.id,
    after: { file_name: fileName, accepted, duplicates, transfers, matched, unknown, rejected },
  });

  revalidatePath("/import");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/insurance");
  revalidatePath("/utilities");
  revalidatePath("/subscriptions");
  revalidatePath("/calendar");

  return { batchId: batch.id, total: rows.length, accepted, duplicates, transfers, matched, unknown, rejected };
}
