import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import AppShell from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  // Middleware already verified this user and forwards the id — skip a second
  // round trip to Supabase Auth just to re-derive it on every page load.
  const userId = headers().get("x-user-id");
  const userEmail = headers().get("x-user-email");

  const [
    { data: profile },
    { count: pendingApprovals },
    { data: dueToday },
  ] = await Promise.all([
    userId ? supabase.from("profiles").select("full_name").eq("id", userId).single() : Promise.resolve({ data: null }),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("commitments")
      .select("id, name, expected_amount")
      .eq("due_date", today)
      .not("status", "in", "(paid,cancelled,expired,paused)"),
  ]);

  const displayName = profile?.full_name || userEmail || "Owner";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppShell
      displayName={displayName}
      initials={initials}
      pendingApprovals={pendingApprovals || 0}
      dueToday={dueToday || []}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
