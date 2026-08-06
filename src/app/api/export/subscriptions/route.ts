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

  const { data: subs } = await supabase
    .from("commitments")
    .select("name, personal_or_office, expected_amount, frequency, due_date, status, subscription_details(category, auto_renew)")
    .eq("commitment_type", "subscription")
    .order("due_date", { ascending: true });

  const header = ["Name", "Usage", "Category", "Amount", "Frequency", "Due date", "Auto-renew", "Status"];
  const rows = (subs || []).map((s: any) => [
    s.name,
    s.personal_or_office,
    s.subscription_details?.category ?? "",
    s.expected_amount ?? "",
    s.frequency ?? "",
    s.due_date ?? "",
    s.subscription_details?.auto_renew ? "Yes" : "No",
    s.status,
  ]);

  if (new URL(request.url).searchParams.get("format") === "xlsx") return xlsxResponse(header, rows, "subscriptions_export.xlsx");
  return csvResponse(toCsv(header, rows), "subscriptions_export.csv");
}
