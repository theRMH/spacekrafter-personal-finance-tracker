"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createInsurancePolicy(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const insuranceType = String(formData.get("insurance_type") || "").trim();
  const provider = String(formData.get("provider") || "").trim() || null;
  const policyNumber = String(formData.get("policy_number") || "").trim() || null;
  const insuredPersonOrAsset = String(formData.get("insured_person_or_asset") || "").trim() || null;
  const premium = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "annual");
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");
  const nominee = String(formData.get("nominee") || "").trim() || null;

  if (!name || !insuranceType || !dueDate) {
    throw new Error("Policy name, insurance type and renewal date are required");
  }

  const { data: commitment, error } = await supabase
    .from("commitments")
    .insert({
      owner_id: user.id,
      commitment_type: "insurance",
      name,
      personal_or_office: personalOrOffice,
      expected_amount: premium,
      frequency,
      due_date: dueDate,
      linked_account_id: linkedAccountId,
      provider,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: detailErr } = await supabase.from("insurance_details").insert({
    commitment_id: commitment.id,
    insurance_type: insuranceType,
    policy_number: policyNumber,
    insured_person_or_asset: insuredPersonOrAsset,
    nominee,
  });
  if (detailErr) throw new Error(detailErr.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "create",
    entityTable: "commitments",
    entityId: commitment.id,
    after: { ...commitment, insurance_type: insuranceType, policy_number: policyNumber },
  });

  revalidatePath("/insurance");
  revalidatePath("/calendar");
}

export async function updateInsurancePolicy(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const insuranceType = String(formData.get("insurance_type") || "").trim();
  const provider = String(formData.get("provider") || "").trim() || null;
  const policyNumber = String(formData.get("policy_number") || "").trim() || null;
  const insuredPersonOrAsset = String(formData.get("insured_person_or_asset") || "").trim() || null;
  const premium = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "annual");
  const dueDate = String(formData.get("due_date") || "");
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");
  const nominee = String(formData.get("nominee") || "").trim() || null;

  if (!id || !name || !insuranceType || !dueDate) {
    throw new Error("Policy name, insurance type and renewal date are required");
  }

  const { data: beforeCommitment } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();
  const { data: beforeDetails } = await supabase.from("insurance_details").select("*").eq("commitment_id", id).single();

  const { data: after, error } = await supabase
    .from("commitments")
    .update({
      name,
      personal_or_office: personalOrOffice,
      expected_amount: premium,
      frequency,
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
    .from("insurance_details")
    .update({ insurance_type: insuranceType, policy_number: policyNumber, insured_person_or_asset: insuredPersonOrAsset, nominee })
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

  revalidatePath("/insurance");
  revalidatePath("/calendar");
}

export async function markCommitmentPaid(formData: FormData) {
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

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "mark_paid", entityTable: "commitments", entityId: id, before, after: { ...before, status: "paid" } });

  revalidatePath("/insurance");
  revalidatePath("/utilities");
  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}

// Shared across Insurance/Utilities/Subscriptions — all three are commitment_type
// rows with a 1:1 detail table (cascades on delete), no type-specific logic needed here.
export async function deleteCommitment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("linked_commitment_id", id);
  if ((count || 0) > 0) throw new Error("This has a linked transaction and cannot be deleted");

  const { data: before } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase.from("commitments").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "delete", entityTable: "commitments", entityId: id, before });

  revalidatePath("/insurance");
  revalidatePath("/utilities");
  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}
