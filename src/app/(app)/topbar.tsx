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

export default function Topbar({ displayName, initials }: { displayName: string; initials: string }) {
  const pathname = usePathname();
  const label = LABELS[pathname] || "Dashboard";

  return (
    <header className="h-[70px] bg-white/90 backdrop-blur border-b border-[#e3ddd7] flex items-center justify-between px-7 sticky top-0 z-20">
      <div className="text-xs text-muted">Owner / {label}</div>
      <div className="flex items-center gap-2.5">
        <Link href="/calendar" className="w-10 h-10 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy" title="Financial Calendar">
          ◷
        </Link>
        <Link href="/approvals" className="w-10 h-10 border border-[#e3ddd7] bg-white rounded-xl grid place-items-center text-navy" title="Approvals">
          ◉
        </Link>
        <Link href="/profile" className="flex items-center gap-2 border border-[#e3ddd7] bg-white rounded-xl px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-success grid place-items-center font-bold text-[11px]">{initials}</div>
          <span className="text-xs font-semibold text-navy">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
