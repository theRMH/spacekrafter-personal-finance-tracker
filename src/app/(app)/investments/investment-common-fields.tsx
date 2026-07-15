export default function InvestmentCommonFields({
  accounts,
  namePlaceholder,
}: {
  accounts: { id: string; name: string }[];
  namePlaceholder: string;
}) {
  return (
    <>
      <div>
        <label className="block text-xs text-muted mb-1.5">Name</label>
        <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder={namePlaceholder} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Invested amount (₹)</label>
          <input name="invested_amount" type="number" step="0.01" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Current value (₹)</label>
          <input name="current_value" type="number" step="0.01" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Valuation date</label>
          <input name="valuation_date" type="date" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Start date</label>
          <input name="start_date" type="date" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Maturity / goal date</label>
          <input name="maturity_date" type="date" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Linked account</label>
          <select name="linked_account_id" className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Nominee</label>
        <input name="nominee" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
      </div>
    </>
  );
}
