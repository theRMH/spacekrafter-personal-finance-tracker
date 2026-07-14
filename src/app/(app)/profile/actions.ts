"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileName(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fullName = String(formData.get("full_name") || "").trim();
  if (!fullName) throw new Error("Name is required");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
}

export async function changePassword(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("Not authenticated");

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  if (!currentPassword || newPassword.length < 6) {
    throw new Error("Current password and a new password (6+ characters) are required");
  }

  // AUTH-03: require current password before allowing a change.
  const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyErr) throw new Error("Current password is incorrect");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    owner_id: user.id,
    actor_id: user.id,
    action: "password_change",
    entity_table: "profiles",
    entity_id: user.id,
  });

  revalidatePath("/profile");
}
