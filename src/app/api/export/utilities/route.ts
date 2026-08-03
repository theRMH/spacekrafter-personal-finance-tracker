import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: connections } = await supabase
    .from("commitments")
    .select("name, personal_or_office, expected_amount, due_date, status, provider, utility_details(utility_type, location, consumer_number, billing_cycle)")
    .eq("commitment_type", "utility")
    .order("due_date", { ascending: true });

  const header = ["Name", "Usage", "Type", "Provider", "Location", "Consumer number", "Billing cycle", "Amount", "Due date", "Status"];
  const rows = (connections || []).map((c: any) => [
    c.name,
    c.personal_or_office,
    c.utility_details?.utility_type ?? "",
    c.provider ?? "",
    c.utility_details?.location ?? "",
    c.utility_details?.consumer_number ?? "",
    c.utility_details?.billing_cycle ?? "",
    c.expected_amount ?? "",
    c.due_date ?? "",
    c.status,
  ]);

  return csvResponse(toCsv(header, rows), "utilities_export.csv");
}
