import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Only ever call this from
// trusted Server Actions that have already verified the caller is an owner
// (e.g. inviting an Accountant), never expose it to a client component.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
