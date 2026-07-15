"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInr, formatDate } from "@/lib/format";
import { commitmentDisplayStatus } from "@/lib/commitments";

type Commitment = {
  id: string;
  name: string;
  commitment_type: string;
  personal_or_office: string;
  expected_amount: number | null;
  due_date: string;
  status: string;
};

const TYPE_DOT: Record<string, string> = {
  insurance: "bg-earth",
  utility: "bg-success",
  subscription: "bg-info",
  emi: "bg-[#a85f33]",
  sip: "bg-navy",
  expected_income: "bg-success",
  other: "bg-muted",
};

// Only these types have a dedicated management page today.
const TYPE_ROUTE: Record<string, string> = {
  insurance: "/insurance",
  utility: "/utilities",
  subscription: "/subscriptions",
};

export default function CalendarView({
  commitments,
  agendaItems,
  year,
  month,
}: {
  commitments: Commitment[];
  agendaItems: Commitment[];
  year: number;
  month: number;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const now = new Date();
  const firstOfMonth = new Date(year, month - 1, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<number, Commitment[]>();
  for (const c of commitments) {
    const d = new Date(c.due_date);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) || []), c]);
    }
  }

  const selectedItems = selectedDay ? byDay.get(selectedDay) || [] : [];
  const selectedLabel = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4">
      <div className="border border-[#e3ddd7] rounded-2xl overflow-hidden bg-[#e3ddd7]">
        <div className="grid grid-cols-7 gap-px bg-[#e3ddd7]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-[#f3f1ee] text-earth text-[8px] sm:text-[9px] font-bold uppercase text-center p-1 sm:p-2">{d}</div>
          ))}
          {cells.map((day, idx) => {
            const isToday = day && year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
            const items = day ? byDay.get(day) || [] : [];
            const isSelected = day === selectedDay;
            return (
              <button
                key={idx}
                type="button"
                disabled={!day}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`text-left bg-white min-h-[54px] sm:min-h-[92px] p-1 sm:p-2 text-[10px] ${!day ? "bg-[#faf9f7] cursor-default" : "cursor-pointer hover:bg-[#faf9f7]"} ${isSelected ? "ring-2 ring-inset ring-info" : ""}`}
              >
                {day && (
                  <span className={`inline-grid place-items-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] sm:text-[10px] font-bold ${isToday ? "bg-info text-white" : ""}`}>
                    {day}
                  </span>
                )}
                {items.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-1 mt-1 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[c.commitment_type] || "bg-muted"}`} />
                    <span className="truncate hidden sm:inline text-[9px]">{c.name}</span>
                  </div>
                ))}
                {items.length > 3 && <div className="text-[8px] text-muted mt-0.5">+{items.length - 3} more</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-4">
        {selectedDay ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-navy">{selectedLabel}</h3>
              <button type="button" onClick={() => setSelectedDay(null)} className="text-[11px] text-info font-semibold">
                ← Back to agenda
              </button>
            </div>
            <div className="grid gap-1">
              {selectedItems.map((c) => {
                const status = commitmentDisplayStatus(c.status, c.due_date);
                const route = TYPE_ROUTE[c.commitment_type];
                const row = (
                  <div className="flex justify-between items-center py-2 border-b border-[#eeeae6] text-xs last:border-0">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[10px] text-muted capitalize">{c.commitment_type.replace("_", " ")} · {status}</div>
                    </div>
                    <div className="font-bold">{c.expected_amount ? formatInr(c.expected_amount) : "-"}</div>
                  </div>
                );
                return route ? (
                  <Link key={c.id} href={route} className="hover:bg-[#faf9f7] rounded-lg px-1 -mx-1">
                    {row}
                  </Link>
                ) : (
                  <div key={c.id}>{row}</div>
                );
              })}
              {selectedItems.length === 0 && <p className="text-xs text-muted">Nothing due on this day.</p>}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
