"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase
    .from("commitments")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/insurance");
  revalidatePath("/utilities");
  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}
