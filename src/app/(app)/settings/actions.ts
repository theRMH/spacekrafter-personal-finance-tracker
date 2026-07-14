"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCategory(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const groupName = String(formData.get("group_name") || "").trim();
  const defaultPersonalOrOffice = String(formData.get("default_personal_or_office") || "") || null;
  if (!groupName) throw new Error("Category group name is required");

  const { error } = await supabase.from("categories").insert({
    owner_id: user.id,
    group_name: groupName,
    name: groupName,
    default_personal_or_office: defaultPersonalOrOffice,
  });
  if (error) throw new Error(error.message);

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
