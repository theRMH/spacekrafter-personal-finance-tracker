import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: investments } = await supabase
    .from("investments")
    .select("investment_type, name, invested_amount, current_value, start_date, valuation_date, mutual_fund_details(amc, scheme_name, folio_number), share_details(company_name, quantity, average_purchase_price)")
    .order("created_at", { ascending: false });

  const header = ["Type", "Name", "Invested", "Current value", "Start date", "Valuation date", "AMC/Company", "Scheme/Folio"];
  const rows = (investments || []).map((i: any) => [
    i.investment_type,
    i.name,
    i.invested_amount,
    i.current_value ?? i.invested_amount,
    i.start_date ?? "",
    i.valuation_date ?? "",
    i.mutual_fund_details?.amc ?? i.share_details?.company_name ?? "",
    i.mutual_fund_details ? `${i.mutual_fund_details.scheme_name} (${i.mutual_fund_details.folio_number ?? "-"})` : i.share_details ? `${i.share_details.quantity} @ ${i.share_details.average_purchase_price}` : "",
  ]);

  return csvResponse(toCsv(header, rows), "investments_export.csv");
}
