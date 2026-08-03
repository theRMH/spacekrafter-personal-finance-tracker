// Shared GET-form date range filter, same pattern as Transactions/Reports.
// Server-rendered, no client interactivity needed for a plain filter submit.
export default function DateRangeFilter({
  from,
  to,
  clearHref,
  extraHidden,
}: {
  from?: string;
  to?: string;
  clearHref: string;
  extraHidden?: { name: string; value: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 mb-4 bg-white border border-[#e3ddd7] rounded-xl p-3">
      {(extraHidden || []).map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}
      <div>
        <label className="block text-[10px] text-muted mb-1">From</label>
        <input type="date" name="from" defaultValue={from} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
      </div>
      <div>
        <label className="block text-[10px] text-muted mb-1">To</label>
        <input type="date" name="to" defaultValue={to} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
      </div>
      <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">
        Apply
      </button>
      {(from || to) && (
        <a href={clearHref} className="text-[11px] text-muted underline px-1">
          Clear filters
        </a>
      )}
    </form>
  );
}
