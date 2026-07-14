import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus } from "@/lib/commitments";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_DOT: Record<string, string> = {
  insurance: "bg-earth",
  utility: "bg-success",
  subscription: "bg-info",
  emi: "bg-[#a85f33]",
  sip: "bg-navy",
  expected_income: "bg-success",
  other: "bg-muted",
};

export default async function CalendarPage({ searchParams }: { searchParams: { year?: string; month?: string; type?: string } }) {
  const supabase = createClient();
  const now = new Date();
  const year = Number(searchParams?.year) || now.getFullYear();
  const month = Number(searchParams?.month) || now.getMonth() + 1;
  const typeFilter = searchParams?.type || "";

  let query = supabase
    .from("commitments")
    .select("id, name, commitment_type, personal_or_office, expected_amount, due_date, status")
    .order("due_date", { ascending: true });
  if (typeFilter) query = query.eq("commitment_type", typeFilter);
  const { data: commitments } = await query;

  const all = commitments || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekOut = new Date(today); weekOut.setDate(weekOut.getDate() + 7);
  const monthOut = new Date(today); monthOut.setDate(monthOut.getDate() + 30);

  const dueThisWeek = all.filter((c) => c.status !== "paid" && c.status !== "cancelled" && new Date(c.due_date) <= weekOut && new Date(c.due_date) >= today);
  const dueNext30 = all.filter((c) => c.status !== "paid" && c.status !== "cancelled" && new Date(c.due_date) <= monthOut && new Date(c.due_date) >= today);
  const overdue = all.filter((c) => c.status !== "paid" && c.status !== "cancelled" && new Date(c.due_date) < today);
  const expectedIncome = all.filter((c) => c.commitment_type === "expected_income" && c.status !== "paid");

  const summary = [
    { label: "Due this week", count: dueThisWeek.length },
    { label: "Next 30 days", count: dueNext30.length },
    { label: "Overdue", count: overdue.length },
    { label: "Expected income", count: expectedIncome.length },
  ];

  // Month grid
  const firstOfMonth = new Date(year, month - 1, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<number, typeof all>();
  for (const c of all) {
    const d = new Date(c.due_date);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) || []), c]);
    }
  }

  const prevLink = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextLink = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const filters = [
    { value: "", label: "All" },
    { value: "insurance", label: "Insurance" },
    { value: "utility", label: "Utilities" },
    { value: "subscription", label: "Subscriptions" },
    { value: "expected_income", label: "Income" },
  ];

  const agendaItems = all
    .filter((c) => c.status !== "paid" && c.status !== "cancelled")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 15);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Financial Calendar</h1>
      <p className="text-sm text-muted mt-1 mb-4">Month, agenda, due, overdue and expected income views</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {summary.map((s) => (
          <div key={s.label} className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className="text-xl font-extrabold text-navy mt-1">{s.count}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-2 items-center">
          <Link href={`/calendar?year=${prevLink.year}&month=${prevLink.month}${typeFilter ? `&type=${typeFilter}` : ""}`} className="border border-[#e3ddd7] rounded-lg px-3 py-2 text-xs bg-white">←</Link>
          <span className="text-sm font-bold text-navy">{MONTH_NAMES[month - 1]} {year}</span>
          <Link href={`/calendar?year=${nextLink.year}&month=${nextLink.month}${typeFilter ? `&type=${typeFilter}` : ""}`} className="border border-[#e3ddd7] rounded-lg px-3 py-2 text-xs bg-white">→</Link>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <Link key={f.value} href={`/calendar?year=${year}&month=${month}${f.value ? `&type=${f.value}` : ""}`} className={`rounded-full px-3 py-1.5 text-xs border ${typeFilter === f.value ? "bg-navy text-white border-navy" : "bg-white border-[#e3ddd7] text-navy"}`}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4">
        <div className="border border-[#e3ddd7] rounded-2xl overflow-hidden bg-[#e3ddd7]">
          <div className="grid grid-cols-7 gap-px bg-[#e3ddd7]">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="bg-[#f3f1ee] text-earth text-[9px] font-bold uppercase text-center p-2">{d}</div>
            ))}
            {cells.map((day, idx) => {
              const isToday = day && year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
              const items = day ? byDay.get(day) || [] : [];
              return (
                <div key={idx} className={`bg-white min-h-[92px] p-2 text-[10px] ${!day ? "bg-[#faf9f7]" : ""}`}>
                  {day && (
                    <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold ${isToday ? "bg-info text-white" : ""}`}>
                      {day}
                    </span>
                  )}
                  {items.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center gap-1 mt-1 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[c.commitment_type] || "bg-muted"}`} />
                      <span className="truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
          <h3 className="text-sm font-bold text-navy mb-3">Agenda</h3>
          <div className="grid gap-1">
            {agendaItems.map((c) => {
              const status = commitmentDisplayStatus(c.status, c.due_date);
              return (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-[#eeeae6] text-xs">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[10px] text-muted">{formatDate(c.due_date)} · {status}</div>
                  </div>
                  <div className="font-bold">{c.expected_amount ? formatInr(c.expected_amount) : "-"}</div>
                </div>
              );
            })}
            {agendaItems.length === 0 && <p className="text-xs text-muted">Nothing upcoming.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
