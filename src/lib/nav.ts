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
