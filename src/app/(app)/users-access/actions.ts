"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRANTABLE_PAGES } from "@/lib/nav";

export async function inviteAccountant(formData: FormData) {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  if (!userId) throw new Error("Not authenticated");

  // Owner can always invite. A delegate Accountant can too, but only once
  // the Owner has granted them '/users-access' — inviting is a create
  // action, same tier as everything else an Accountant can be granted.
  const { data: caller } = await supabase.from("profiles").select("role, managed_owner_id, allowed_pages").eq("id", userId).single();
  const isOwner = caller?.role === "owner";
  const isDelegate = caller?.role === "accountant" && (caller.allowed_pages || []).includes("/users-access");
  if (!isOwner && !isDelegate) throw new Error("You don't have access to invite an Accountant");

  // A delegate's invite still belongs to the real Owner's account, never to
  // the delegate's own id — they don't have accountants of their own.
  const effectiveOwnerId = isOwner ? userId : caller!.managed_owner_id;
  if (!effectiveOwnerId) throw new Error("Could not resolve the account owner");

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

  // New invites start with zero page access — the Owner grants pages
  // explicitly afterward via the checklist, nothing is assumed.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role: "accountant",
    managed_owner_id: effectiveOwnerId,
    allowed_pages: [],
  });
  if (profileErr) throw new Error(profileErr.message);

  await supabase.from("audit_log").insert({
    owner_id: effectiveOwnerId,
    actor_id: userId,
    action: "invite_accountant",
    entity_table: "profiles",
    entity_id: created.user.id,
    after: { full_name: fullName, email },
  });

  revalidatePath("/users-access");
}

// Toggling permissions is an edit action, so unlike inviting, this stays
// Owner-exclusive with no delegate exception — RLS backs this up too
// (profiles_owner_update_managed only matches the real Owner's own uid).
export async function updateAccountantPermissions(formData: FormData) {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  if (!userId) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (caller?.role !== "owner") throw new Error("Only the Owner can change access");

  const accountantId = String(formData.get("accountant_id") || "");
  if (!accountantId) throw new Error("Missing accountant");

  const validHrefs = new Set(GRANTABLE_PAGES.map((p) => p.href));
  const nextAllowed = GRANTABLE_PAGES.map((p) => p.href).filter((href) => formData.get(`page_${href}`) === "on" && validHrefs.has(href));

  const { data: before } = await supabase.from("profiles").select("allowed_pages").eq("id", accountantId).eq("managed_owner_id", userId).single();
  if (!before) throw new Error("Accountant not found");

  const { error } = await supabase
    .from("profiles")
    .update({ allowed_pages: nextAllowed })
    .eq("id", accountantId)
    .eq("managed_owner_id", userId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    owner_id: userId,
    actor_id: userId,
    action: "update_accountant_access",
    entity_table: "profiles",
    entity_id: accountantId,
    before: { allowed_pages: before.allowed_pages },
    after: { allowed_pages: nextAllowed },
  });

  revalidatePath("/users-access");
}

// A full removal, not just clearing allowed_pages — deletes the Accountant's
// login entirely so they disappear from the roster. Owner-exclusive, same as
// permission changes, since this is even more destructive than an edit.
export async function removeAccountant(formData: FormData) {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  if (!userId) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (caller?.role !== "owner") throw new Error("Only the Owner can remove an Accountant");

  const accountantId = String(formData.get("accountant_id") || "");
  if (!accountantId) throw new Error("Missing accountant");

  const { data: target } = await supabase
    .from("profiles")
    .select("full_name, allowed_pages")
    .eq("id", accountantId)
    .eq("managed_owner_id", userId)
    .single();
  if (!target) throw new Error("Accountant not found");

  // audit_log.actor_id has no ON DELETE CASCADE (unlike owner_id) — clear this
  // accountant's own log entries first, or deleting their auth user below
  // fails on a foreign-key violation.
  await supabase.from("audit_log").delete().eq("actor_id", accountantId).eq("owner_id", userId);

  await supabase.from("audit_log").insert({
    owner_id: userId,
    actor_id: userId,
    action: "remove_accountant",
    entity_table: "profiles",
    entity_id: accountantId,
    before: { full_name: target.full_name, allowed_pages: target.allowed_pages },
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(accountantId);
  if (error) throw new Error(error.message);

  revalidatePath("/users-access");
}
