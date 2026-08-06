import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { xlsxResponse } from "@/lib/xlsx-export";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: sources } = await supabase
    .from("commitments")
    .select("name, personal_or_office, expected_amount, frequency, due_date, status, income_source_details(income_type, payer_or_property, notes)")
    .eq("commitment_type", "expected_income")
    .order("due_date", { ascending: true });

  const header = ["Source", "Usage", "Type", "Payer/Property", "Expected amount", "Frequency", "Next expected date", "Status", "Notes"];
  const rows = (sources || []).map((s: any) => [
    s.name,
    s.personal_or_office,
    s.income_source_details?.income_type ?? "",
    s.income_source_details?.payer_or_property ?? "",
    s.expected_amount ?? "",
    s.frequency ?? "",
    s.due_date ?? "",
    s.status,
    s.income_source_details?.notes ?? "",
  ]);

  if (new URL(request.url).searchParams.get("format") === "xlsx") return xlsxResponse(header, rows, "income_sources_export.xlsx");
  return csvResponse(toCsv(header, rows), "income_sources_export.csv");
}
