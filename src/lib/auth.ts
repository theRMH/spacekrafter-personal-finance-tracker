import type { SupabaseClient } from "@supabase/supabase-js";

// Owners write data under their own id; an Accountant writes under the Owner
// they're linked to (profiles.managed_owner_id), so records they create still
// belong to the Owner's account rather than a separate accountant-only pile.
export async function getEffectiveOwnerId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("role, managed_owner_id").eq("id", userId).single();
  if (profile?.role === "accountant" && profile.managed_owner_id) {
    return profile.managed_owner_id;
  }
  return userId;
}
