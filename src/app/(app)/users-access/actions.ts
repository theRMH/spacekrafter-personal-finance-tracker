"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteAccountant(formData: FormData) {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  if (!userId) throw new Error("Not authenticated");

  // Only an Owner may invite — an Accountant has no managed_owner_id of their own.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "owner") throw new Error("Only the Owner can invite an Accountant");

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    throw new Error("Name, email and a temporary password are required");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw new Error(createErr.message);

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role: "accountant",
    managed_owner_id: userId,
  });
  if (profileErr) throw new Error(profileErr.message);

  await supabase.from("audit_log").insert({
    owner_id: userId,
    actor_id: userId,
    action: "invite_accountant",
    entity_table: "profiles",
    entity_id: created.user.id,
    after: { full_name: fullName, email },
  });

  revalidatePath("/users-access");
}
