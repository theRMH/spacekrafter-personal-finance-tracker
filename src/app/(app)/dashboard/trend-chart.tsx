"use client";

import { useState } from "react";
import { formatInr } from "@/lib/format";

type TrendPoint = { label: string; income: number; expense: number };

const chartW = 640;
const chartH = 200;
const padL = 10;
const padR = 10;

export default function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.income, t.expense)));
  const stepX = (chartW - padL - padR) / (trend.length - 1 || 1);
  const toY = (v: number) => chartH - 20 - (v / maxTrend) * (chartH - 40);

  const incomePoints = trend.map((t, i) => `${padL + i * stepX},${toY(t.income)}`).join(" ");
  const expensePoints = trend.map((t, i) => `${padL + i * stepX},${toY(t.expense)}`).join(" ");

  const active = activeIndex !== null ? trend[activeIndex] : null;
  const activeX = activeIndex !== null ? padL + activeIndex * stepX : 0;
  const tooltipLeftPct = Math.min(90, Math.max(10, (activeX / chartW) * 100));

  return (
    <div className="relative">
      {active && (
        <div
          className="absolute -top-1 z-10 -translate-x-1/2 bg-navy text-white rounded-lg px-3 py-2 text-[11px] shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <div className="font-bold mb-1">{active.label}</div>
          <div className="flex items-center gap-1.5">
            <i className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
            Income: {formatInr(active.income)}
          </div>
          <div className="flex items-center gap-1.5">
            <i className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            Expense: {formatInr(active.expense)}
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full h-[200px]"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padL} y1={chartH - 20 - f * (chartH - 40)} x2={chartW - padR} y2={chartH - 20 - f * (chartH - 40)} stroke="#edf0ee" />
        ))}
        <polyline fill="none" stroke="#181E32" strokeWidth="3" points={incomePoints} />
        <polyline fill="none" stroke="#56A688" strokeWidth="3" points={expensePoints} />
        {trend.map((t, i) => {
          const x = padL + i * stepX;
          const isActive = i === activeIndex;
          return (
            <g key={t.label}>
              {isActive && <line x1={x} y1={10} x2={x} y2={chartH - 20} stroke="#CDC1B4" strokeWidth="1" />}
              <circle cx={x} cy={toY(t.income)} r={isActive ? 5 : 3} fill="#181E32" />
              <circle cx={x} cy={toY(t.expense)} r={isActive ? 5 : 3} fill="#56A688" />
              <text x={x} y={chartH - 4} fontSize="10" fill="#767678" textAnchor="middle">{t.label}</text>
              {/* Wide invisible hit target so hover/tap doesn't require pixel-precision on the line itself. */}
              <rect
                x={x - stepX / 2}
                y={0}
                width={stepX}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => setActiveIndex(i === activeIndex ? null : i)}
                onTouchStart={() => setActiveIndex(i)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
