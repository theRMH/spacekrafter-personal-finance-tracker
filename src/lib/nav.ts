// Accountant v1 scope: View/Add/Import only on Accounts, Import Statements,
// Add Entry, Transactions (to see what they just added/imported) and Profile.
// This is the single source of truth for both nav filtering (app-shell) and
// route gating (middleware) — RLS is the real security boundary, this just
// keeps the two UI-facing lists from drifting apart.
export const ACCOUNTANT_ALLOWED_PATHS = ["/accounts", "/import", "/add-entry", "/transactions", "/profile"];
export const ACCOUNTANT_DEFAULT_PATH = "/accounts";

export function navForRole(role: string | null) {
  if (role !== "accountant") return NAV_GROUPS;
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => ACCOUNTANT_ALLOWED_PATHS.includes(i.href)) })).filter(
    (g) => g.items.length > 0
  );
}

export const NAV_GROUPS: { group: string; items: { href: string; label: string; icon: string; badgeKey?: string }[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "▦" },
      { href: "/transactions", label: "Transactions", icon: "⇄" },
      { href: "/accounts", label: "Accounts", icon: "▣" },
      { href: "/import", label: "Import Statements", icon: "⇧" },
      { href: "/add-entry", label: "Add Entry", icon: "＋" },
    ],
  },
  {
    group: "Personal Finance",
    items: [
      { href: "/income-sources", label: "Income Sources", icon: "◎" },
      { href: "/insurance", label: "Insurance", icon: "◆" },
      { href: "/utilities", label: "Utilities", icon: "⌁" },
      { href: "/subscriptions", label: "Subscriptions", icon: "◫" },
      { href: "/investments", label: "Investments", icon: "◈" },
      { href: "/plans", label: "Plans and Projections", icon: "▤" },
      { href: "/calendar", label: "Financial Calendar", icon: "◷" },
    ],
  },
  {
    group: "Control",
    items: [
      { href: "/approvals", label: "Approvals", icon: "✓", badgeKey: "approvals" },
      { href: "/reports", label: "Reports and Insights", icon: "◔" },
      { href: "/users-access", label: "Users & Access", icon: "♙" },
      { href: "/settings", label: "Settings", icon: "⚙" },
    ],
  },
];
