"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAccount(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "");
  const personalOrOffice = String(formData.get("personal_or_office") || "");
  const openingBalance = Number(formData.get("opening_balance") || 0);

  if (!name || !type || !personalOrOffice) {
    throw new Error("Name, type and personal/office are required");
  }

  const { error } = await supabase.from("accounts").insert({
    owner_id: user.id,
    name,
    type,
    personal_or_office: personalOrOffice,
    opening_balance: openingBalance,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/add-entry");
}
