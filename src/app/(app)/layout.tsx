import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import AppShell from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  // Runs on every page load — fire the user check and the approvals badge
  // count together instead of one after another.
  const [
    {
      data: { user },
    },
    { count: pendingApprovals },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  const displayName = profile?.full_name || user?.email || "Owner";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppShell displayName={displayName} initials={initials} pendingApprovals={pendingApprovals || 0} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
