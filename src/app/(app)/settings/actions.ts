"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createCategory(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const groupName = String(formData.get("group_name") || "").trim();
  const defaultPersonalOrOffice = String(formData.get("default_personal_or_office") || "") || null;
  if (!groupName) throw new Error("Category group name is required");

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      owner_id: user.id,
      group_name: groupName,
      name: groupName,
      default_personal_or_office: defaultPersonalOrOffice,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "create", entityTable: "categories", entityId: created.id, after: created });

  revalidatePath("/settings");
  return created;
}

// The code is auto-assigned by a DB trigger on insert (categories_assign_code
// in 0016_category_codes.sql) — this is the Owner's correction path if they
// want to fix or align it with an existing chart of accounts.
export async function updateCategoryCode(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const code = String(formData.get("code") || "").trim();
  if (!code) throw new Error("Code cannot be empty");

  const { data: before } = await supabase.from("categories").select("code").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase.from("categories").update({ code }).eq("id", id).eq("owner_id", user.id);
  if (error) {
    if (error.code === "23505") throw new Error(`Code "${code}" is already used by another category`);
    throw new Error(error.message);
  }

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "update_code", entityTable: "categories", entityId: id, before, after: { code } });

  revalidatePath("/settings");
}

export async function deleteCategory(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  // MASTER-04: used categories cannot be hard-deleted.
  const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("category_id", id);
  if ((count || 0) > 0) throw new Error("Category is used by existing transactions and cannot be deleted");

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function createSubcategory(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const categoryId = String(formData.get("category_id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!categoryId || !name) throw new Error("Category and subcategory name are required");

  const { error } = await supabase.from("subcategories").insert({ owner_id: user.id, category_id: categoryId, name });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function deleteSubcategory(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("subcategory_id", id);
  if ((count || 0) > 0) throw new Error("Subcategory is used by existing transactions and cannot be deleted");

  const { error } = await supabase.from("subcategories").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function createCategoryRule(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const keyword = String(formData.get("keyword") || "").trim().toUpperCase();
  const categoryId = String(formData.get("category_id") || "");
  const subcategoryId = String(formData.get("subcategory_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "") || null;
  if (!keyword || !categoryId) throw new Error("Keyword and category are required");

  const { error } = await supabase.from("category_rules").insert({
    owner_id: user.id,
    keyword,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    personal_or_office: personalOrOffice,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function deleteCategoryRule(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { error } = await supabase.from("category_rules").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
