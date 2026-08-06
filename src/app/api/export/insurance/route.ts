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

  const { data: policies } = await supabase
    .from("commitments")
    .select("name, personal_or_office, expected_amount, frequency, due_date, status, provider, insurance_details(insurance_type, policy_number, insured_person_or_asset, nominee)")
    .eq("commitment_type", "insurance")
    .order("due_date", { ascending: true });

  const header = ["Name", "Usage", "Type", "Provider", "Policy number", "Insured person/asset", "Nominee", "Premium", "Frequency", "Due date", "Status"];
  const rows = (policies || []).map((p: any) => [
    p.name,
    p.personal_or_office,
    p.insurance_details?.insurance_type ?? "",
    p.provider ?? "",
    p.insurance_details?.policy_number ?? "",
    p.insurance_details?.insured_person_or_asset ?? "",
    p.insurance_details?.nominee ?? "",
    p.expected_amount ?? "",
    p.frequency ?? "",
    p.due_date ?? "",
    p.status,
  ]);

  if (new URL(request.url).searchParams.get("format") === "xlsx") return xlsxResponse(header, rows, "insurance_export.xlsx");
  return csvResponse(toCsv(header, rows), "insurance_export.csv");
}
