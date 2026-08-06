"use client";

// CSV/Excel download links plus a "Download PDF" trigger (the browser's own
// Print dialog, already wired up via the print:hidden classes app-shell.tsx
// puts on the sidebar/header) — one shared bar instead of rebuilding this
// per page. Marked print:hidden itself so it doesn't show up in the PDF.
export default function DownloadBar({ csvHref }: { csvHref: string }) {
  const xlsxHref = `${csvHref}${csvHref.includes("?") ? "&" : "?"}format=xlsx`;

  return (
    <div className="flex gap-2 print:hidden">
      <a href={csvHref} className="bg-white border border-[#e3ddd7] rounded-xl px-4 py-2.5 text-sm font-semibold text-navy">
        CSV
      </a>
      <a href={xlsxHref} className="bg-white border border-[#e3ddd7] rounded-xl px-4 py-2.5 text-sm font-semibold text-navy">
        Excel
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
      >
        Download PDF
      </button>
    </div>
  );
}
