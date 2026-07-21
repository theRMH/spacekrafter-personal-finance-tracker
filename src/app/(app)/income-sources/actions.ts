"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createIncomeSource(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const incomeType = String(formData.get("income_type") || "").trim();
  const payerOrProperty = String(formData.get("payer_or_property") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const expectedAmount = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "monthly");
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!name || !incomeType || !dueDate) {
    throw new Error("Source name, income type and next expected date are required");
  }

  const { data: commitment, error } = await supabase
    .from("commitments")
    .insert({
      owner_id: user.id,
      commitment_type: "expected_income",
      name,
      personal_or_office: personalOrOffice,
      expected_amount: expectedAmount,
      frequency,
      due_date: dueDate,
      linked_account_id: linkedAccountId,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: detailErr } = await supabase.from("income_source_details").insert({
    commitment_id: commitment.id,
    income_type: incomeType,
    payer_or_property: payerOrProperty,
    notes,
  });
  if (detailErr) throw new Error(detailErr.message);

  revalidatePath("/income-sources");
  revalidatePath("/calendar");
}

export async function updateIncomeSource(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const incomeType = String(formData.get("income_type") || "").trim();
  const payerOrProperty = String(formData.get("payer_or_property") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const expectedAmount = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "monthly");
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!id || !name || !incomeType || !dueDate) {
    throw new Error("Source name, income type and next expected date are required");
  }

  const { error } = await supabase
    .from("commitments")
    .update({
      name,
      personal_or_office: personalOrOffice,
      expected_amount: expectedAmount,
      frequency,
      due_date: dueDate,
      linked_account_id: linkedAccountId,
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  const { error: detailErr } = await supabase
    .from("income_source_details")
    .update({ income_type: incomeType, payer_or_property: payerOrProperty, notes })
    .eq("commitment_id", id);
  if (detailErr) throw new Error(detailErr.message);

  revalidatePath("/income-sources");
  revalidatePath("/calendar");
  revalidatePath("/plans");
}

export async function markIncomeReceived(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("commitments")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/income-sources");
  revalidatePath("/calendar");
}
