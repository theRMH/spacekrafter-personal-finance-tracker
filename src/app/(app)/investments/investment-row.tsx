"use client";

import { useState } from "react";
import { formatInr, formatDate } from "@/lib/format";
import { updateCurrentValue, updateInvestment, deleteInvestment } from "./actions";
import InvestmentCommonFields from "./investment-common-fields";

type MutualFundDetails = {
  amc: string | null; scheme_name: string | null; category: string | null; folio_number: string | null;
  agent_advisor: string | null; investment_mode: string | null; sip_amount: number | null; sip_frequency: string | null; units: number | null;
};
type ShareDetails = {
  company_name: string | null; symbol: string | null; sector: string | null; broker: string | null;
  demat_account: string | null; quantity: number | null; average_purchase_price: number | null;
};
type Investment = {
  id: string;
  investment_type: string;
  name: string;
  invested_amount: number;
  current_value: number | null;
  valuation_date: string | null;
  start_date: string | null;
  maturity_date: string | null;
  nominee: string | null;
  linked_account_id: string | null;
  mutual_fund_details: MutualFundDetails | null;
  share_details: ShareDetails | null;
};

export default function InvestmentRow({ investment: i, accounts }: { investment: Investment; accounts: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-t border-[#edf0ee] bg-[#faf9f7]">
        <td colSpan={8} className="p-4">
          <form
            action={async (formData) => {
              await updateInvestment(formData);
              setEditing(false);
            }}
            className="grid gap-4"
          >
            <input type="hidden" name="id" value={i.id} />
            <InvestmentCommonFields
              accounts={accounts}
              namePlaceholder={i.name}
              defaults={{
                name: i.name,
                invested_amount: i.invested_amount,
                current_value: i.current_value,
                valuation_date: i.valuation_date,
                start_date: i.start_date,
                maturity_date: i.maturity_date,
                linked_account_id: i.linked_account_id,
                nominee: i.nominee,
              }}
            />

            {i.investment_type === "mutual_fund" && (
              <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
                <legend className="text-xs font-bold text-navy px-1">Mutual Fund details</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <input name="amc" placeholder="AMC / fund company" defaultValue={i.mutual_fund_details?.amc ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="scheme_name" placeholder="Scheme name" defaultValue={i.mutual_fund_details?.scheme_name ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <select name="mf_category" defaultValue={i.mutual_fund_details?.category ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
                    <option value="">Category</option>
                    <option value="debt">Debt</option>
                    <option value="equity">Equity</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="elss">ELSS</option>
                  </select>
                  <input name="folio_number" placeholder="Folio number" defaultValue={i.mutual_fund_details?.folio_number ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="agent_advisor" placeholder="Agent / advisor" defaultValue={i.mutual_fund_details?.agent_advisor ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <select name="investment_mode" defaultValue={i.mutual_fund_details?.investment_mode ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs">
                    <option value="">SIP or Lump sum</option>
                    <option value="sip">SIP</option>
                    <option value="lump_sum">Lump Sum</option>
                  </select>
                  <input name="sip_amount" type="number" step="0.01" placeholder="SIP amount" defaultValue={i.mutual_fund_details?.sip_amount ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="sip_frequency" placeholder="SIP frequency" defaultValue={i.mutual_fund_details?.sip_frequency ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="units" type="number" step="0.0001" placeholder="Units" defaultValue={i.mutual_fund_details?.units ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                </div>
              </fieldset>
            )}

            {i.investment_type === "share" && (
              <fieldset className="border border-[#e3ddd7] rounded-xl p-4">
                <legend className="text-xs font-bold text-navy px-1">Share details</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <input name="company_name" placeholder="Company name" defaultValue={i.share_details?.company_name ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="symbol" placeholder="Symbol" defaultValue={i.share_details?.symbol ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="sector" placeholder="Sector" defaultValue={i.share_details?.sector ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="broker" placeholder="Broker" defaultValue={i.share_details?.broker ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="demat_account" placeholder="Demat account" defaultValue={i.share_details?.demat_account ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="quantity" type="number" step="0.0001" placeholder="Quantity" defaultValue={i.share_details?.quantity ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                  <input name="average_purchase_price" type="number" step="0.01" placeholder="Average purchase price" defaultValue={i.share_details?.average_purchase_price ?? ""} className="border border-[#e3ddd7] rounded-lg p-2 text-xs" />
                </div>
              </fieldset>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-xs font-semibold">Save changes</button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted underline">Cancel</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[#edf0ee]">
      <td className="p-3 font-semibold">
        {i.name}
        {i.mutual_fund_details?.scheme_name && <div className="text-muted font-normal">{i.mutual_fund_details.amc} — {i.mutual_fund_details.scheme_name}</div>}
      </td>
      <td className="p-3 capitalize">{i.investment_type.replace(/_/g, " ")}</td>
      <td className="p-3">{formatInr(i.invested_amount)}</td>
      <td className="p-3">{i.start_date ? formatDate(i.start_date) : "-"}</td>
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
      <td className="p-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-info text-[11px] font-semibold">Edit</button>
          <form action={deleteInvestment}>
            <input type="hidden" name="id" value={i.id} />
            <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">Delete</button>
          </form>
        </div>
      </td>
    </tr>
  );
}
