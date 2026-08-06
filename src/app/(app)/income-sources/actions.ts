"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "create",
    entityTable: "commitments",
    entityId: commitment.id,
    after: { ...commitment, income_type: incomeType, payer_or_property: payerOrProperty },
  });

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

  const { data: beforeCommitment } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();
  const { data: beforeDetails } = await supabase.from("income_source_details").select("*").eq("commitment_id", id).single();

  const { data: after, error } = await supabase
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
    .eq("owner_id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { data: afterDetails, error: detailErr } = await supabase
    .from("income_source_details")
    .update({ income_type: incomeType, payer_or_property: payerOrProperty, notes })
    .eq("commitment_id", id)
    .select()
    .single();
  if (detailErr) throw new Error(detailErr.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "update",
    entityTable: "commitments",
    entityId: id,
    before: { ...beforeCommitment, ...beforeDetails },
    after: { ...after, ...afterDetails },
  });

  revalidatePath("/income-sources");
  revalidatePath("/calendar");
  revalidatePath("/plans");
}

export async function deleteIncomeSource(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("linked_commitment_id", id);
  if ((count || 0) > 0) throw new Error("This source has a linked transaction and cannot be deleted");

  const { data: before } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase.from("commitments").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "delete", entityTable: "commitments", entityId: id, before });

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
  const { data: before } = await supabase.from("commitments").select("id, name, status").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase
    .from("commitments")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "mark_received", entityTable: "commitments", entityId: id, before, after: { ...before, status: "paid" } });

  revalidatePath("/income-sources");
  revalidatePath("/calendar");
}
