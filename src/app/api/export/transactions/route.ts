import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: transactions } = await supabase
    .from("transactions")
    .select("transaction_date, type, personal_or_office, amount, payee_payer, narration, reference, status, source, accounts(name), categories(group_name), subcategories(name)")
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false });

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

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions_export.csv"`,
    },
  });
}
