import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Additive-only expansion for an already-seeded owner. Safe to re-run — every
// insert is an upsert on the same unique keys seed-owner.mjs uses, so nothing
// is duplicated and nothing existing is touched.
const NEW_SUBCATEGORIES = [
  { group: "Income - Salary and Personal", subs: ["Investment Returns / Payouts"] },
  { group: "Home - Groceries and Food", subs: ["Fresh Produce and Dairy (Fruits, Vegetables, Milk)", "Drinking Water", "Meat / Non-Veg"] },
  { group: "Home - Transport", subs: ["Driver Salary"] },
  { group: "Home - Education and Children", subs: ["Tuition / Coaching Fees"] },
  { group: "Home - Health and Personal Care", subs: ["Supplements / Protein", "Pet Care"] },
  { group: "Home - Lifestyle and Entertainment", subs: ["Movies and Outings", "Laundry Expenses"] },
  { group: "Investments - Real Estate and Business", subs: ["Property Purchase - Legal and Documentation"] },
];

const NEW_GROUPS = [
  { group: "Home - Religious and Family", office: "personal", subs: ["Religious / Temple Expenses", "Family Functions and Events"] },
];

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

  const { data: categories } = await supabase.from("categories").select("id, group_name").eq("owner_id", ownerId);
  const byGroup = new Map(categories.map((c) => [c.group_name, c.id]));

  for (const { group, subs } of NEW_SUBCATEGORIES) {
    const categoryId = byGroup.get(group);
    if (!categoryId) {
      console.error(`Skipping "${group}" — category not found for this owner.`);
      continue;
    }
    for (const name of subs) {
      const { error } = await supabase
        .from("subcategories")
        .upsert({ owner_id: ownerId, category_id: categoryId, name }, { onConflict: "category_id,name" });
      if (error) console.error(`Failed to upsert subcategory "${name}":`, error.message);
      else console.log(`OK: ${group} / ${name}`);
    }
  }

  for (const { group, office, subs } of NEW_GROUPS) {
    const { data: category, error: catErr } = await supabase
      .from("categories")
      .upsert(
        { owner_id: ownerId, group_name: group, name: group, default_personal_or_office: office },
        { onConflict: "owner_id,group_name,name" }
      )
      .select()
      .single();
    if (catErr) {
      console.error(`Failed to upsert category "${group}":`, catErr.message);
      continue;
    }
    console.log(`OK: new group ${group}`);
    for (const name of subs) {
      const { error } = await supabase
        .from("subcategories")
        .upsert({ owner_id: ownerId, category_id: category.id, name }, { onConflict: "category_id,name" });
      if (error) console.error(`Failed to upsert subcategory "${name}":`, error.message);
      else console.log(`OK: ${group} / ${name}`);
    }
  }

  console.log("Done.");
}

main();
