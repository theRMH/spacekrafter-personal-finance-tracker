"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("transactions").insert({
    owner_id: user.id,
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
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  redirect("/transactions");
}
