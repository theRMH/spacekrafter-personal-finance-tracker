type Defaults = {
  name?: string;
  invested_amount?: number | null;
  current_value?: number | null;
  valuation_date?: string | null;
  start_date?: string | null;
  maturity_date?: string | null;
  linked_account_id?: string | null;
  nominee?: string | null;
};

export default function InvestmentCommonFields({
  accounts,
  namePlaceholder,
  defaults,
}: {
  accounts: { id: string; name: string }[];
  namePlaceholder: string;
  defaults?: Defaults;
}) {
  return (
    <>
      <div>
        <label className="block text-xs text-muted mb-1.5">Name</label>
        <input name="name" required defaultValue={defaults?.name} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder={namePlaceholder} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Invested amount (₹)</label>
          <input name="invested_amount" type="number" step="0.01" required defaultValue={defaults?.invested_amount ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Current value (₹)</label>
          <input name="current_value" type="number" step="0.01" defaultValue={defaults?.current_value ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Valuation date</label>
          <input name="valuation_date" type="date" defaultValue={defaults?.valuation_date ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Start date</label>
          <input name="start_date" type="date" defaultValue={defaults?.start_date ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Maturity / goal date</label>
          <input name="maturity_date" type="date" defaultValue={defaults?.maturity_date ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Linked account</label>
          <select name="linked_account_id" defaultValue={defaults?.linked_account_id ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
            <option value="">-</option>
            {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Nominee</label>
        <input name="nominee" defaultValue={defaults?.nominee ?? ""} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
      </div>
    </>
  );
}
