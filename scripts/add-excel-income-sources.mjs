import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Named recurring income sources from the client's Excel that don't already
// have a category-level home (rent from specific properties, payouts from a
// specific manager, an annual contract) — the rest of the Excel's income
// lines (business sales, salary, freelance) are already covered as regular
// income categories and don't need a separate source record.
//
// Amounts are left at 0 — the source Excel had them scrubbed for privacy, and
// we don't invent financial figures. due_date is a placeholder (1st of next
// month) since the schema requires one; Nirmal edits both from the Income
// Sources page whenever he has real numbers.
const SOURCES = [
  { name: "Kodambakkam Flat Rent", income_type: "Rental", payer_or_property: "Kodambakkam Property" },
  { name: "Bangalore Flat Rent", income_type: "Rental", payer_or_property: "Bangalore Property" },
  { name: "Lavanya - Crypto Investment Payout", income_type: "Investment Payout", payer_or_property: "Lavanya" },
  { name: "Lavanya - Portfolio Management Payout", income_type: "Investment Payout", payer_or_property: "Lavanya" },
  { name: "KitchenAid AMC", income_type: "Service / AMC Revenue", payer_or_property: "KitchenAid" },
];

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

function nextMonthFirst() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { data: profiles } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1);
  const ownerId = profiles?.[0]?.id;
  if (!ownerId) throw new Error("No owner profile found");

  const { data: existing } = await supabase
    .from("commitments")
    .select("id, name")
    .eq("owner_id", ownerId)
    .eq("commitment_type", "expected_income");
  const existingNames = new Set((existing || []).map((c) => c.name));

  for (const s of SOURCES) {
    if (existingNames.has(s.name)) {
      console.log(`Skipping "${s.name}" — already exists.`);
      continue;
    }

    const { data: commitment, error } = await supabase
      .from("commitments")
      .insert({
        owner_id: ownerId,
        commitment_type: "expected_income",
        name: s.name,
        personal_or_office: "personal",
        expected_amount: 0,
        frequency: "monthly",
        due_date: nextMonthFirst(),
        status: "upcoming",
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to create "${s.name}":`, error.message);
      continue;
    }

    const { error: detailErr } = await supabase.from("income_source_details").insert({
      commitment_id: commitment.id,
      income_type: s.income_type,
      payer_or_property: s.payer_or_property,
      notes: "Amount not yet entered — sourced from client's Excel template, figures were blank there too.",
    });
    if (detailErr) console.error(`Failed to add details for "${s.name}":`, detailErr.message);
    else console.log(`OK: ${s.name}`);
  }

  console.log("Done.");
}

main();
