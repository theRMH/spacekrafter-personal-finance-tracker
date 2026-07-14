"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  await supabase.from("audit_log").insert({
    owner_id: user.id,
    actor_id: user.id,
    action: "categorize_confirm",
    entity_table: "transactions",
    entity_id: id,
    after: { category_id: categoryId, subcategory_id: subcategoryId, personal_or_office: personalOrOffice, status: "confirmed" },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function confirmProvisional(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("transactions")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function softDeleteTransaction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    owner_id: user.id,
    actor_id: user.id,
    action: "soft_delete",
    entity_table: "transactions",
    entity_id: id,
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
