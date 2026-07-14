"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function Topbar({
  displayName,
  initials,
  onMenuClick,
}: {
  displayName: string;
  initials: string;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const label = LABELS[pathname] || "Dashboard";

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
        <Link href="/approvals" className="w-9 h-9 sm:w-10 sm:h-10 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy" title="Approvals">
          ◉
        </Link>
        <Link href="/profile" className="flex items-center gap-2 border border-[#e3ddd7] bg-white rounded-xl px-2 sm:px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-success grid place-items-center font-bold text-[11px] shrink-0">{initials}</div>
          <span className="hidden sm:inline text-xs font-semibold text-navy">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
