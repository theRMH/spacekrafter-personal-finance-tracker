"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navForRole } from "@/lib/nav";
import Topbar from "./topbar";

type DueTodayItem = { id: string; name: string; expected_amount: number | null };

export default function AppShell({
  displayName,
  initials,
  role,
  pendingApprovals,
  dueToday,
  signOutAction,
  children,
}: {
  displayName: string;
  initials: string;
  role: string;
  pendingApprovals: number;
  dueToday: DueTodayItem[];
  signOutAction: () => void;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [pinnedPaths, setPinnedPaths] = useState<string[]>([]);
  const pathname = usePathname();
  const navGroups = navForRole(role);
  const allItems = navGroups.flatMap((g) => g.items);
  const pinnedItems = allItems.filter((item) => pinnedPaths.includes(item.href));

  // Restore collapsed-group/pinned state after mount — kept out of the initial
  // render so server and first client paint match (no hydration mismatch);
  // it just syncs in a frame later, same as any localStorage-backed UI state.
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem("navCollapsedGroups");
      if (savedGroups) setCollapsedGroups(JSON.parse(savedGroups));
      const savedPins = localStorage.getItem("navPinnedPaths");
      if (savedPins) setPinnedPaths(JSON.parse(savedPins));
    } catch {
      // Ignore malformed/inaccessible storage — just falls back to defaults.
    }
  }, []);

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      localStorage.setItem("navCollapsedGroups", JSON.stringify(next));
      return next;
    });
  }

  function togglePin(href: string) {
    setPinnedPaths((prev) => {
      const next = prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href];
      localStorage.setItem("navPinnedPaths", JSON.stringify(next));
      return next;
    });
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div className="md:grid md:grid-cols-[268px_1fr] min-h-screen">
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-sidebar text-white p-4 overflow-auto
          fixed inset-y-0 left-0 w-[268px] z-40 transition-transform duration-200
          ${navOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:sticky md:top-0 md:h-screen md:w-auto md:z-auto`}
      >
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
          {pinnedItems.length > 0 && (
            <div className="mb-1">
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">Pinned</div>
              {pinnedItems.map((item) => (
                <div key={item.href} className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2.5 my-0.5 rounded-xl text-[13px] text-white/85 hover:bg-[#2b3657] hover:text-white transition-colors"
                  >
                    <span className="w-5 text-center opacity-90">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey === "approvals" && pendingApprovals > 0 && (
                      <span className="bg-[#c97f3c] text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{pendingApprovals}</span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePin(item.href)}
                    aria-label={`Unpin ${item.label}`}
                    className="shrink-0 w-6 h-6 grid place-items-center rounded-lg text-[11px] text-info hover:bg-[#2b3657]"
                  >
                    📌
                  </button>
                </div>
              ))}
            </div>
          )}

          {navGroups.map((g) => {
            const isCollapsed = !!collapsedGroups[g.group];
            return (
              <div key={g.group} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.group)}
                  aria-expanded={!isCollapsed}
                  className="flex items-center justify-between w-full px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 hover:text-white/70"
                >
                  {g.group}
                  <span className={`text-[9px] transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>▾</span>
                </button>
                {!isCollapsed &&
                  g.items.map((item) => {
                    const isPinned = pinnedPaths.includes(item.href);
                    return (
                      <div key={item.href} className="flex items-center gap-1 group">
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2.5 my-0.5 rounded-xl text-[13px] text-white/85 hover:bg-[#2b3657] hover:text-white transition-colors"
                        >
                          <span className="w-5 text-center opacity-90">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badgeKey === "approvals" && pendingApprovals > 0 && (
                            <span className="bg-[#c97f3c] text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{pendingApprovals}</span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => togglePin(item.href)}
                          aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                          className={`shrink-0 w-6 h-6 grid place-items-center rounded-lg text-[11px] hover:bg-[#2b3657] ${isPinned ? "text-info" : "text-white/30 hover:text-white/70"}`}
                        >
                          📌
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10">
          <Link href="/profile" className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-success grid place-items-center font-bold text-xs">
              {initials}
            </div>
            <div>
              <b className="block text-xs">{displayName}</b>
              <span className="text-[10px] text-white/60 capitalize">{role} access</span>
            </div>
          </Link>
          <form action={signOutAction}>
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
        <Topbar
          displayName={displayName}
          initials={initials}
          pendingApprovals={pendingApprovals}
          dueToday={dueToday}
          onMenuClick={() => setNavOpen((v) => !v)}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-[1400px] mx-auto p-4 sm:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
