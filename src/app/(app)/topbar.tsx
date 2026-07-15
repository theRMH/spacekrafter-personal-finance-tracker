"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatInr } from "@/lib/format";

const LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/accounts": "Accounts",
  "/import": "Import Statements",
  "/add-entry": "Add Entry",
  "/insurance": "Insurance",
  "/utilities": "Utilities",
  "/subscriptions": "Subscriptions",
  "/investments": "Investments",
  "/plans": "Plans and Projections",
  "/calendar": "Financial Calendar",
  "/approvals": "Approvals",
  "/reports": "Reports and Insights",
  "/users-access": "Users & Access",
  "/settings": "Settings",
  "/profile": "Profile",
};

type DueTodayItem = { id: string; name: string; expected_amount: number | null };

export default function Topbar({
  displayName,
  initials,
  pendingApprovals,
  dueToday,
  onMenuClick,
}: {
  displayName: string;
  initials: string;
  pendingApprovals: number;
  dueToday: DueTodayItem[];
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const label = LABELS[pathname] || "Dashboard";
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const badgeCount = dueToday.length + pendingApprovals;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="h-[64px] sm:h-[70px] bg-white/90 backdrop-blur border-b border-[#e3ddd7] flex items-center justify-between px-3 sm:px-7 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy shrink-0"
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="text-xs text-muted truncate">Owner / {label}</div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <Link href="/calendar" className="w-9 h-9 sm:w-10 sm:h-10 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy" title="Financial Calendar">
          ◷
        </Link>

        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((v) => !v)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy"
            title="Today"
            aria-label="Notifications"
          >
            ◉
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#b64b52] text-white rounded-full min-w-[16px] h-[16px] px-1 text-[9px] font-bold grid place-items-center">
                {badgeCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-[#e3ddd7] rounded-xl shadow-lg p-3 z-30">
              <div className="text-[11px] font-bold text-navy uppercase tracking-wide mb-2">Due today</div>
              {dueToday.length === 0 && <p className="text-xs text-muted mb-3">Nothing due today.</p>}
              {dueToday.length > 0 && (
                <div className="grid gap-1.5 mb-3">
                  {dueToday.map((item) => (
                    <Link
                      key={item.id}
                      href="/calendar"
                      onClick={() => setBellOpen(false)}
                      className="flex justify-between items-center text-xs hover:bg-[#faf9f7] rounded-lg px-1.5 py-1"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="font-semibold ml-2 shrink-0">{item.expected_amount ? formatInr(item.expected_amount) : "-"}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-[#edf0ee] pt-2">
                <Link
                  href="/approvals"
                  onClick={() => setBellOpen(false)}
                  className="flex justify-between items-center text-xs hover:bg-[#faf9f7] rounded-lg px-1.5 py-1"
                >
                  <span>Pending approvals</span>
                  <span className="font-semibold">{pendingApprovals}</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link href="/profile" className="flex items-center gap-2 border border-[#e3ddd7] bg-white rounded-xl px-2 sm:px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-success grid place-items-center font-bold text-[11px] shrink-0">{initials}</div>
          <span className="hidden sm:inline text-xs font-semibold text-navy">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
