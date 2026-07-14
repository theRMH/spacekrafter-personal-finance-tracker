// Upcoming/Due/Overdue are computed from due_date; Paid/Paused/Cancelled/Expired are explicit states (REM-01/UTIL-07/SUB-06).
export function commitmentDisplayStatus(status: string, dueDate: string): string {
  if (["paid", "paused", "cancelled", "expired"].includes(status)) return status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  if (due < today) return "overdue";
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  if (due <= sevenDaysOut) return "due";
  return "upcoming";
}

export const STATUS_STYLE: Record<string, string> = {
  overdue: "bg-[#fdeaea] text-[#b64b52]",
  due: "bg-[#fff0dc] text-[#a9793b]",
  upcoming: "bg-[#e8eff8] text-info",
  paid: "bg-[#e5f4eb] text-success",
  paused: "bg-[#eef2ef] text-muted",
  cancelled: "bg-[#eef2ef] text-muted",
  expired: "bg-[#eef2ef] text-muted",
};

export const FREQUENCIES = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
];
