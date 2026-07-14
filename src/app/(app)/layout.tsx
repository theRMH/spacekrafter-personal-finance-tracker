import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NAV_GROUPS } from "@/lib/nav";
import { signOut } from "./actions";
import Topbar from "./topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  const { count: pendingApprovals } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const displayName = profile?.full_name || user?.email || "Owner";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid md:grid-cols-[268px_1fr] min-h-screen">
      <aside className="bg-sidebar text-white p-4 md:sticky md:top-0 md:h-screen overflow-auto">
        <div className="flex items-center gap-3 px-2 pb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-navy grid place-items-center font-bold">
            SP
          </div>
          <div>
            <strong className="block text-sm">Spacekrafter</strong>
            <span className="text-[11px] text-white/60">Personal Finance Tracker</span>
          </div>
        </div>

        <nav className="mt-1">
          {NAV_GROUPS.map((g) => (
            <div key={g.group} className="mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/45 px-3 pt-4 pb-1.5">{g.group}</div>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 my-0.5 rounded-xl text-[13px] text-white/85 hover:bg-[#2b3657] hover:text-white transition-colors"
                >
                  <span className="w-5 text-center opacity-90">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badgeKey === "approvals" && (pendingApprovals || 0) > 0 && (
                    <span className="bg-[#c97f3c] text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{pendingApprovals}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10">
          <Link href="/profile" className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-success grid place-items-center font-bold text-xs">
              {initials}
            </div>
            <div>
              <b className="block text-xs">{displayName}</b>
              <span className="text-[10px] text-white/60">Owner access</span>
            </div>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-xs rounded-xl text-white/70 hover:bg-[#2b3657] hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <Topbar displayName={displayName} initials={initials} />
        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
