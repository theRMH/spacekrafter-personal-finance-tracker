import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const usage = searchParams.get("usage");

  let query = supabase
    .from("transactions")
    .select("transaction_date, type, personal_or_office, amount, payee_payer, narration, reference, status, source, accounts(name), categories(group_name), subcategories(name)")
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });
  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lte("transaction_date", to);
  if (usage) query = query.eq("personal_or_office", usage);

  const { data: transactions } = await query;

  const header = ["Date", "Type", "Usage", "Amount", "Account", "Payee/Payer", "Category", "Subcategory", "Reference", "Narration", "Status", "Source"];
  const rows = (transactions || []).map((t: any) => [
    t.transaction_date,
    t.type,
    t.personal_or_office,
    t.amount,
    t.accounts?.name ?? "",
    t.payee_payer ?? "",
    t.categories?.group_name ?? "",
    t.subcategories?.name ?? "",
    t.reference ?? "",
    t.narration ?? "",
    t.status,
    t.source,
  ]);

  return csvResponse(toCsv(header, rows), "transactions_export.csv");
}
