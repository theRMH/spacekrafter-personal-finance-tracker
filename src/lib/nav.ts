// Every path here is always reachable regardless of role or grants — an
// Accountant's own Profile page, basically.
export const UNIVERSAL_PATHS = ["/profile"];

// Accountant page access is Owner-controlled per accountant (profiles.allowed_pages),
// not a fixed list — this is the single source of truth for both nav filtering
// (app-shell) and route gating (middleware). RLS is the real security boundary;
// an Accountant always gets View + Add on whatever's granted here, never Edit/Delete,
// on every page, granted or not.
export function navForRole(role: string | null, allowedPages: string[] = []) {
  if (role !== "accountant") return NAV_GROUPS;
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowedPages.includes(i.href)) })).filter(
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
    group: "Finance",
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

// Flat catalog of every grantable page, in the same order as the sidebar —
// used to render the Owner's permission checklist on Users & Access.
export const GRANTABLE_PAGES = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, group: g.group })));
