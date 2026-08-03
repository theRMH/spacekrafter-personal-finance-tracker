"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
    >
      Print / Save as PDF
    </button>
  );
}
