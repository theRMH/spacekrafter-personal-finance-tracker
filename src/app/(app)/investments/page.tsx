import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { createInvestment, updateCurrentValue } from "./actions";

const SUBTABS = [
  { value: "", label: "Overview" },
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "share", label: "Shares" },
  { value: "fd_rd", label: "Fixed Deposits / RD" },
  { value: "ppf_nps", label: "PPF / NPS" },
  { value: "gold_bond", label: "Gold / Bonds" },
  { value: "real_estate", label: "Real Estate" },
  { value: "business_capital", label: "Business Capital" },
  { value: "other", label: "Other" },
];

export default async function InvestmentsPage({ searchParams }: { searchParams: { type?: string } }) {
  const supabase = createClient();
  const activeType = searchParams?.type || "";

  let query = supabase
    .from("investments")
    .select("id, investment_type, name, invested_amount, current_value, valuation_date, linked_account_id, mutual_fund_details(amc, scheme_name, category, folio_number), share_details(company_name, quantity, average_purchase_price)")
    .order("created_at", { ascending: false });
  if (activeType) query = query.eq("investment_type", activeType);
  const { data: investments } = await query;

  const { data: allInvestments } = await supabase.from("investments").select("investment_type, invested_amount, current_value");
  const { data: accounts } = await supabase.from("accounts").select("id, name").order("name");

  const totalInvested = (allInvestments || []).reduce((s, i) => s + Number(i.invested_amount || 0), 0);
  const totalCurrent = (allInvestments || []).reduce((s, i) => s + Number(i.current_value || i.invested_amount || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Investments</h1>
      <p className="text-sm text-muted mt-1 mb-4">Overview, Mutual Funds, Shares and other investment types</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {SUBTABS.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/investments?type=${t.value}` : "/investments"}
            className={`rounded-full px-3 py-2 text-xs border ${activeType === t.value ? "bg-navy text-white border-navy" : "bg-white border-[#e3ddd7] text-navy"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!activeType && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
            <div className="text-[11px] uppercase tracking-wide text-muted">Amount invested</div>
            <div className="text-2xl font-extrabold text-navy mt-2">{formatInr(totalInvested)}</div>
          </div>
          <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
            <div className="text-[11px] uppercase tracking-wide text-muted">Current recorded value</div>
            <div className="text-2xl font-extrabold text-navy mt-2">{formatInr(totalCurrent)}</div>
          </div>
          <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-5">
            <div className="text-[11px] uppercase tracking-wide text-muted">Unrealised gain/loss</div>
            <div className={`text-2xl font-extrabold mt-2 ${totalCurrent - totalInvested >= 0 ? "text-success" : "text-[#b64b52]"}`}>
              {formatInr(totalCurrent - totalInvested)}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-8">
        <table className="w-full text-xs min-w-[820px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Invested</th>
              <th className="text-left p-3">Current value</th>
              <th className="text-left p-3">Valuation date</th>
              <th className="text-left p-3">Update value</th>
            </tr>
          </thead>
          <tbody>
            {(investments || []).map((i: any) => (
              <tr key={i.id} className="border-t border-[#edf0ee]">
                <td className="p-3 font-semibold">
                  {i.name}
                  {i.mutual_fund_details?.scheme_name && <div className="text-muted font-normal">{i.mutual_fund_details.amc} — {i.mutual_fund_details.scheme_name}</div>}
                </td>
                <td className="p-3 capitalize">{i.investment_type.replace(/_/g, " ")}</td>
                <td className="p-3">{formatInr(i.invested_amount)}</td>
                <td className="p-3">{i.current_value ? formatInr(i.current_value) : "-"}</td>
                <td className="p-3">{i.valuation_date ? formatDate(i.valuation_date) : "-"}</td>
                <td className="p-3">
                  <form action={updateCurrentValue} className="flex gap-1">
                    <input type="hidden" name="id" value={i.id} />
                    <input name="current_value" type="number" step="0.01" placeholder="Value" className="w-20 border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]" />
                    <input name="valuation_date" type="date" className="border border-[#e3ddd7] rounded-lg p-1.5 text-[11px]" />
                    <button type="submit" className="bg-[#edf1f7] text-info rounded-lg px-2 text-[11px] font-semibold">Save</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!investments || investments.length === 0) && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">No investments in this view yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-3xl">
        <h3 className="text-sm font-bold text-navy mb-1">Add investment</h3>
        <p className="text-xs text-muted mb-4">Fill the Mutual Fund or Share section only if that&apos;s the type you select.</p>
        <form action={createInvestment} className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Investment type</label>
              <select name="investment_type" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5">
                {SUBTABS.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Name</label>
              <input name="name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" placeholder="Axis Bluechip Fund / Reliance shares / FD #1" />
            </div>
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

          <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
            <legend className="text-xs font-bold text-navy px-1">Mutual Fund fields (only if type = Mutual Funds)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <input name="amc" placeholder="AMC / fund company" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="scheme_name" placeholder="Scheme name" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <select name="mf_category" className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">Category</option>
                <option value="debt">Debt</option>
                <option value="equity">Equity</option>
                <option value="hybrid">Hybrid</option>
                <option value="elss">ELSS</option>
              </select>
              <input name="folio_number" placeholder="Folio number" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="agent_advisor" placeholder="Agent / advisor" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <select name="investment_mode" className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
                <option value="">SIP or Lump sum</option>
                <option value="sip">SIP</option>
                <option value="lump_sum">Lump Sum</option>
              </select>
              <input name="sip_amount" type="number" step="0.01" placeholder="SIP amount" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="sip_frequency" placeholder="SIP frequency" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="units" type="number" step="0.0001" placeholder="Units" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
          </fieldset>

          <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
            <legend className="text-xs font-bold text-navy px-1">Share fields (only if type = Shares)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <input name="company_name" placeholder="Company name" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="symbol" placeholder="Symbol" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="sector" placeholder="Sector" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="broker" placeholder="Broker" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="demat_account" placeholder="Demat account" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="quantity" type="number" step="0.0001" placeholder="Quantity" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
              <input name="average_purchase_price" type="number" step="0.01" placeholder="Average purchase price" className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
            </div>
          </fieldset>

          <div>
            <label className="block text-xs text-muted mb-1.5">Nominee</label>
            <input name="nominee" className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
          </div>

          <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
            + Add investment
          </button>
        </form>
      </div>
    </div>
  );
}
