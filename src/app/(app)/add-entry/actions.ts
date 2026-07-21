"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/auth";

export async function createTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

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
  const linkedCommitmentId = String(formData.get("linked_commitment_id") || "") || null;

  if (!transactionDate || !amount || amount <= 0 || !type || !personalOrOffice || !accountId) {
    throw new Error("Date, amount, type, usage and account are required");
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("type")
    .eq("id", accountId)
    .single();

  // ENTRY-04/05, BR-07/08: cash is final immediately; bank/card/UPI manual
  // entries stay provisional until a later statement import matches them.
  const status = account?.type === "cash" ? "confirmed" : "provisional";
  const ownerId = await getEffectiveOwnerId(supabase, user.id);

  const { error } = await supabase.from("transactions").insert({
    owner_id: ownerId,
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
    status,
    source: "manual",
    linked_commitment_id: type === "income" ? linkedCommitmentId : null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  redirect("/transactions");
}
