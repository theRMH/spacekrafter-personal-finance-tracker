"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createUtilityConnection(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const utilityType = String(formData.get("utility_type") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const provider = String(formData.get("provider") || "").trim() || null;
  const consumerNumber = String(formData.get("consumer_number") || "").trim() || null;
  const billingCycle = String(formData.get("billing_cycle") || "monthly");
  const expectedAmount = Number(formData.get("expected_amount") || 0) || null;
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!name || !utilityType || !location || !dueDate) {
    throw new Error("Connection name, utility type, location and due date are required");
  }

  const { data: commitment, error } = await supabase
    .from("commitments")
    .insert({
      owner_id: user.id,
      commitment_type: "utility",
      name,
      personal_or_office: personalOrOffice,
      expected_amount: expectedAmount,
      frequency: billingCycle === "monthly" ? "monthly" : "custom",
      due_date: dueDate,
      linked_account_id: linkedAccountId,
      provider,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: detailErr } = await supabase.from("utility_details").insert({
    commitment_id: commitment.id,
    utility_type: utilityType,
    location,
    consumer_number: consumerNumber,
    billing_cycle: billingCycle,
  });
  if (detailErr) throw new Error(detailErr.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "create",
    entityTable: "commitments",
    entityId: commitment.id,
    after: { ...commitment, utility_type: utilityType, location, consumer_number: consumerNumber },
  });

  revalidatePath("/utilities");
  revalidatePath("/calendar");
}

export async function updateUtilityConnection(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const utilityType = String(formData.get("utility_type") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const provider = String(formData.get("provider") || "").trim() || null;
  const consumerNumber = String(formData.get("consumer_number") || "").trim() || null;
  const billingCycle = String(formData.get("billing_cycle") || "monthly");
  const expectedAmount = Number(formData.get("expected_amount") || 0) || null;
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!id || !name || !utilityType || !location || !dueDate) {
    throw new Error("Connection name, utility type, location and due date are required");
  }

  const { data: beforeCommitment } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();
  const { data: beforeDetails } = await supabase.from("utility_details").select("*").eq("commitment_id", id).single();

  const { data: after, error } = await supabase
    .from("commitments")
    .update({
      name,
      personal_or_office: personalOrOffice,
      expected_amount: expectedAmount,
      frequency: billingCycle === "monthly" ? "monthly" : "custom",
      due_date: dueDate,
      linked_account_id: linkedAccountId,
      provider,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { data: afterDetails, error: detailErr } = await supabase
    .from("utility_details")
    .update({ utility_type: utilityType, location, consumer_number: consumerNumber, billing_cycle: billingCycle })
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

  revalidatePath("/utilities");
  revalidatePath("/calendar");
}
