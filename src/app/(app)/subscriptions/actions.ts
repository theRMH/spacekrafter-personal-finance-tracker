"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createSubscription(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const amount = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "monthly");
  const dueDate = String(formData.get("due_date") || "");
  const autoRenew = formData.get("auto_renew") === "on";
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!name || !dueDate) {
    throw new Error("Name and renewal date are required");
  }

  const { data: commitment, error } = await supabase
    .from("commitments")
    .insert({
      owner_id: user.id,
      commitment_type: "subscription",
      name,
      personal_or_office: personalOrOffice,
      expected_amount: amount,
      frequency,
      due_date: dueDate,
      linked_account_id: linkedAccountId,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: detailErr } = await supabase.from("subscription_details").insert({
    commitment_id: commitment.id,
    category,
    auto_renew: autoRenew,
  });
  if (detailErr) throw new Error(detailErr.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "create",
    entityTable: "commitments",
    entityId: commitment.id,
    after: { ...commitment, category, auto_renew: autoRenew },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}

export async function updateSubscription(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const amount = Number(formData.get("expected_amount") || 0) || null;
  const frequency = String(formData.get("frequency") || "monthly");
  const dueDate = String(formData.get("due_date") || "");
  const autoRenew = formData.get("auto_renew") === "on";
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;
  const personalOrOffice = String(formData.get("personal_or_office") || "personal");

  if (!id || !name || !dueDate) {
    throw new Error("Name and renewal date are required");
  }

  const { data: beforeCommitment } = await supabase.from("commitments").select("*").eq("id", id).eq("owner_id", user.id).single();
  const { data: beforeDetails } = await supabase.from("subscription_details").select("*").eq("commitment_id", id).single();

  const { data: after, error } = await supabase
    .from("commitments")
    .update({
      name,
      personal_or_office: personalOrOffice,
      expected_amount: amount,
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
    .from("subscription_details")
    .update({ category, auto_renew: autoRenew })
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

  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}

export async function cancelSubscription(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const { data: before } = await supabase.from("commitments").select("id, name, status").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase.from("commitments").update({ status: "cancelled" }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { ownerId: user.id, actorId: user.id, action: "cancel", entityTable: "commitments", entityId: id, before, after: { ...before, status: "cancelled" } });

  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}

export async function restartSubscription(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const restartDate = String(formData.get("restart_date") || "");
  if (!restartDate) throw new Error("Restart date is required");

  const { data: before } = await supabase.from("commitments").select("id, name, status, due_date").eq("id", id).eq("owner_id", user.id).single();

  const { error } = await supabase
    .from("commitments")
    .update({ status: "upcoming", due_date: restartDate })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    ownerId: user.id,
    actorId: user.id,
    action: "restart",
    entityTable: "commitments",
    entityId: id,
    before,
    after: { ...before, status: "upcoming", due_date: restartDate },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}
