"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/auth";
import { typesForUsage } from "@/lib/transaction-types";

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
  const paymentMode = String(formData.get("payment_mode") || "").trim() || null;

  if (!transactionDate || !amount || amount <= 0 || !type || !personalOrOffice || !accountId || !categoryId || !subcategoryId || !payeePayer) {
    throw new Error("Date, amount, type, usage, account, category, subcategory and payee/payer are required");
  }

  if (!typesForUsage(personalOrOffice).some((t) => t.value === type)) {
    throw new Error(`"${type}" is not a valid type for ${personalOrOffice} entries`);
  }

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
    status: "confirmed",
    source: "manual",
    linked_commitment_id: type === "income" ? linkedCommitmentId : null,
    payment_mode: paymentMode,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  redirect("/transactions");
}
