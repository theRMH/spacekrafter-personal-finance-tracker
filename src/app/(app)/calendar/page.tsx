import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "./calendar-view";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

      <CalendarView commitments={all} agendaItems={agendaItems} year={year} month={month} />
    </div>
  );
}
