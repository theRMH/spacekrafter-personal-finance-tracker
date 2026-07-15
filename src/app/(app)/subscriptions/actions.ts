"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.from("commitments").update({ status: "cancelled" }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error(error.message);

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

  const { error } = await supabase
    .from("commitments")
    .update({ status: "upcoming", due_date: restartDate })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/subscriptions");
  revalidatePath("/calendar");
}
