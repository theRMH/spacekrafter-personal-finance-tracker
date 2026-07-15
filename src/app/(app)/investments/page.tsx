import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, formatDate } from "@/lib/format";
import { updateCurrentValue } from "./actions";
import AddInvestmentForm from "./add-investment-form";
import AddMutualFundForm from "./add-mutual-fund-form";
import AddShareForm from "./add-share-form";
import AddSimpleInvestmentForm from "./add-simple-investment-form";

const SIMPLE_TYPE_META: Record<string, { label: string; placeholder: string }> = {
  fd_rd: { label: "Fixed Deposit / RD", placeholder: "HDFC FD #1" },
  ppf_nps: { label: "PPF / NPS", placeholder: "PPF Account" },
  gold_bond: { label: "Gold / Bond", placeholder: "Sovereign Gold Bond" },
  real_estate: { label: "Real Estate", placeholder: "2BHK Whitefield" },
  business_capital: { label: "Business Capital", placeholder: "Working capital reserve" },
  other: { label: "Investment", placeholder: "Description" },
};

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

  const [{ data: investments }, { data: allInvestments }, { data: accounts }] = await Promise.all([
    query,
    supabase.from("investments").select("investment_type, invested_amount, current_value"),
    supabase.from("accounts").select("id, name").order("name"),
  ]);

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

      {activeType === "" && <AddInvestmentForm accounts={accounts || []} />}
      {activeType === "mutual_fund" && <AddMutualFundForm accounts={accounts || []} />}
      {activeType === "share" && <AddShareForm accounts={accounts || []} />}
      {SIMPLE_TYPE_META[activeType] && (
        <AddSimpleInvestmentForm
          accounts={accounts || []}
          investmentType={activeType}
          label={SIMPLE_TYPE_META[activeType].label}
          namePlaceholder={SIMPLE_TYPE_META[activeType].placeholder}
        />
      )}
    </div>
  );
}
