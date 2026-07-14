"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createInvestment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const investmentType = String(formData.get("investment_type") || "");
  const name = String(formData.get("name") || "").trim();
  const investedAmount = Number(formData.get("invested_amount") || 0);
  const currentValue = Number(formData.get("current_value") || 0) || null;
  const valuationDate = String(formData.get("valuation_date") || "") || null;
  const startDate = String(formData.get("start_date") || "") || null;
  const maturityDate = String(formData.get("maturity_date") || "") || null;
  const nominee = String(formData.get("nominee") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const linkedAccountId = String(formData.get("linked_account_id") || "") || null;

  if (!investmentType || !name) throw new Error("Investment type and name are required");
  if (currentValue && !valuationDate) throw new Error("Valuation date is required when current value is set");

  const { data: investment, error } = await supabase
    .from("investments")
    .insert({
      owner_id: user.id,
      investment_type: investmentType,
      name,
      invested_amount: investedAmount,
      current_value: currentValue,
      valuation_date: valuationDate,
      start_date: startDate,
      maturity_date: maturityDate,
      nominee,
      notes,
      linked_account_id: linkedAccountId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (investmentType === "mutual_fund") {
    const { error: mfErr } = await supabase.from("mutual_fund_details").insert({
      investment_id: investment.id,
      amc: String(formData.get("amc") || "").trim() || null,
      scheme_name: String(formData.get("scheme_name") || "").trim() || null,
      category: String(formData.get("mf_category") || "") || null,
      folio_number: String(formData.get("folio_number") || "").trim() || null,
      agent_advisor: String(formData.get("agent_advisor") || "").trim() || null,
      investment_mode: String(formData.get("investment_mode") || "") || null,
      sip_amount: Number(formData.get("sip_amount") || 0) || null,
      sip_frequency: String(formData.get("sip_frequency") || "").trim() || null,
      units: Number(formData.get("units") || 0) || null,
    });
    if (mfErr) throw new Error(mfErr.message);
  }

  if (investmentType === "share") {
    const { error: shareErr } = await supabase.from("share_details").insert({
      investment_id: investment.id,
      company_name: String(formData.get("company_name") || name).trim(),
      symbol: String(formData.get("symbol") || "").trim() || null,
      sector: String(formData.get("sector") || "").trim() || null,
      broker: String(formData.get("broker") || "").trim() || null,
      demat_account: String(formData.get("demat_account") || "").trim() || null,
      quantity: Number(formData.get("quantity") || 0) || null,
      average_purchase_price: Number(formData.get("average_purchase_price") || 0) || null,
    });
    if (shareErr) throw new Error(shareErr.message);
  }

  revalidatePath("/investments");
}

export async function updateCurrentValue(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const currentValue = Number(formData.get("current_value") || 0);
  const valuationDate = String(formData.get("valuation_date") || "");
  if (!valuationDate) throw new Error("Valuation date is required");

  const { error } = await supabase
    .from("investments")
    .update({ current_value: currentValue, valuation_date: valuationDate })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/investments");
}
