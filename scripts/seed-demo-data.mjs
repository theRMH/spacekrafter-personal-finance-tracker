import { createClient } from "@supabase/supabase-js";
import ws from "ws";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function main() {
  const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
  const ownerId = profiles?.[0]?.id;
  if (!ownerId) throw new Error("No owner profile found — run npm run seed first");

  const { data: accounts } = await supabase.from("accounts").select("id, name").eq("owner_id", ownerId);
  const hdfc = accounts.find((a) => a.name === "HDFC Personal")?.id;
  const icici = accounts.find((a) => a.name === "ICICI Office")?.id;
  if (!hdfc || !icici) throw new Error("Expected accounts 'HDFC Personal' and 'ICICI Office' to already exist");

  const { data: categories } = await supabase.from("categories").select("id, group_name").eq("owner_id", ownerId);
  const catId = (group) => categories.find((c) => c.group_name === group)?.id || null;

  // Recurring pattern applied across the last 5 completed months (this month already has real demo data from verification).
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() });
  }

  const rows = [];
  for (const { y, m } of months) {
    const day = (n) => `${y}-${String(m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;

    rows.push(
      { owner_id: ownerId, transaction_date: day(1), amount: 125000 + Math.round(Math.random() * 8000), type: "income", personal_or_office: "personal", account_id: hdfc, category_id: catId("Income - Salary and Personal"), payee_payer: "Salary", narration: "SALARY CREDIT", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(3), amount: 180000 + Math.round(Math.random() * 40000), type: "income", personal_or_office: "office", account_id: icici, category_id: catId("Income - Business"), payee_payer: "Client Retainer", narration: "CLIENT PAYMENT", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(4), amount: 32000, type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Housing"), payee_payer: "Landlord", narration: "HOME RENT", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(6), amount: 6200 + Math.round(Math.random() * 1500), type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Groceries and Food"), payee_payer: "BigBasket", narration: "GROCERIES", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(8), amount: 1200 + Math.round(Math.random() * 900), type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Groceries and Food"), payee_payer: "Swiggy", narration: "SWIGGY ORDER", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(10), amount: 4200 + Math.round(Math.random() * 2000), type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Lifestyle and Entertainment"), payee_payer: "Amazon", narration: "AMAZON SHOPPING", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(12), amount: 3600 + Math.round(Math.random() * 800), type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Transport"), payee_payer: "Indian Oil", narration: "FUEL", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(14), amount: 65000 + Math.round(Math.random() * 15000), type: "expense", personal_or_office: "office", account_id: icici, category_id: catId("Office - Staff and Payroll"), payee_payer: "Vendor A", narration: "STAFF SALARY", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(16), amount: 8500 + Math.round(Math.random() * 2000), type: "expense", personal_or_office: "office", account_id: icici, category_id: catId("Office - Sales, Marketing and Admin"), payee_payer: "Zoho Corp", narration: "SOFTWARE SUBSCRIPTION", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(18), amount: 2200 + Math.round(Math.random() * 600), type: "expense", personal_or_office: "personal", account_id: hdfc, category_id: catId("Home - Health and Personal Care"), payee_payer: "Apollo Pharmacy", narration: "MEDICINES", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(20), amount: 25000, type: "investment", personal_or_office: "personal", account_id: hdfc, category_id: catId("Investments - Market"), payee_payer: "Axis Mutual Fund", narration: "SIP CONTRIBUTION", status: "confirmed", source: "manual" },
      { owner_id: ownerId, transaction_date: day(22), amount: 18400 + Math.round(Math.random() * 5000), type: "expense", personal_or_office: "office", account_id: icici, category_id: catId("Office - Purchase / Inventory"), payee_payer: "BSH Appliances", narration: "INVENTORY PURCHASE", status: "confirmed", source: "manual" }
    );
  }

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);

  console.log(`Inserted ${rows.length} demo transactions across ${months.length} months.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
