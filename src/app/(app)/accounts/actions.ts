"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({
      owner_id: user.id,
      name,
      type,
      personal_or_office: personalOrOffice,
      opening_balance: openingBalance,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "create",
    entityTable: "accounts",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/add-entry");
}

export async function updateAccount(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "");
  const personalOrOffice = String(formData.get("personal_or_office") || "");
  const openingBalance = Number(formData.get("opening_balance") || 0);

  if (!name || !type || !personalOrOffice) {
    throw new Error("Name, type and personal/office are required");
  }

  const { data: before } = await supabase.from("accounts").select("*").eq("id", id).eq("owner_id", user.id).single();
  if (!before) throw new Error("Account not found");

  const { data: after, error } = await supabase
    .from("accounts")
    .update({ name, type, personal_or_office: personalOrOffice, opening_balance: openingBalance })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "update",
    entityTable: "accounts",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/add-entry");
}

export async function deleteAccount(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));

  const { count: txCount } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", id);
  if ((txCount || 0) > 0) throw new Error("Account has transactions and cannot be deleted");

  const { count: commitmentCount } = await supabase.from("commitments").select("id", { count: "exact", head: true }).eq("linked_account_id", id);
  if ((commitmentCount || 0) > 0) throw new Error("Account is linked to a commitment and cannot be deleted");

  const { data: before } = await supabase.from("accounts").select("*").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "delete",
    entityTable: "accounts",
    entityId: id,
    before,
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/add-entry");
}
