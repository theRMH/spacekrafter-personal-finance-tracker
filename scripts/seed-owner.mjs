import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Initial master categories — PRD v1.1 Appendix A.
const CATEGORY_SEED = [
  { group: "Income - Salary and Personal", office: "personal", subs: ["Monthly Salary / Take-home Pay", "Bonus / Incentive Pay", "Freelance / Consulting Income", "Rental Income", "Dividend / Interest Income", "Other Personal Income"] },
  { group: "Income - Business", office: "office", subs: ["Interior Contracting Projects Revenue", "BSH Home Appliances Sales", "KitchenAid Service Revenue", "Furniture and Chair Sales", "Modular Workstation Sales", "Sauna and Steam Room Revenue", "Project Advances / Deposits", "Other Business Income"] },
  { group: "Home - Housing", office: "personal", subs: ["Rent / Home Loan EMI", "Maintenance / Society Charges", "Property Tax", "Home Insurance Premium"] },
  { group: "Home - Utilities", office: "personal", subs: ["Electricity", "Water", "Gas / LPG", "Internet and Cable", "Mobile Phone Bills"] },
  { group: "Home - Groceries and Food", office: "personal", subs: ["Groceries and Vegetables", "Dining Out / Restaurant", "Food Delivery"] },
  { group: "Home - Transport", office: "personal", subs: ["Fuel / Petrol", "Car EMI / Insurance", "Vehicle Maintenance and Service", "Cab / Ola / Uber"] },
  { group: "Home - Health and Personal Care", office: "personal", subs: ["Medical / Doctor Visits", "Medicines and Pharmacy", "Health Insurance Premium", "Gym / Fitness", "Salon / Grooming / Personal Care"] },
  { group: "Home - Education and Children", office: "personal", subs: ["School / Tuition Fees", "Books / Stationery", "Online Courses / Subscriptions"] },
  { group: "Home - Lifestyle and Entertainment", office: "personal", subs: ["OTT Subscriptions", "Shopping", "Electronics / Gadgets", "Travel / Holidays", "Gifts and Celebrations", "Domestic Help / Maid Salary"] },
  { group: "Home - Loans and Miscellaneous", office: "personal", subs: ["Personal Loan EMI", "Credit Card Payments", "Charitable Donations", "Miscellaneous / Unexpected Expenses"] },
  { group: "Office - Overheads", office: "office", subs: ["Office Rent / Lease", "Electricity and Utilities", "Internet and Phone", "Maintenance and Housekeeping", "Office Supplies and Stationery"] },
  { group: "Office - Staff and Payroll", office: "office", subs: ["Staff Salaries", "Contract Labour / Site Workers", "PF / ESI / Statutory Compliance", "Freelancer / Consultant Fees"] },
  { group: "Office - Purchase / Inventory", office: "office", subs: ["BSH Appliances", "KitchenAid Products", "Furniture / Chairs Raw Material", "Modular Workstation Components", "Gym Equipment", "Sauna Materials / Units", "Interior Contracting Materials"] },
  { group: "Office - Project and Site", office: "office", subs: ["Site Labour / Contractor Payments", "Transportation / Logistics", "Tools and Equipment", "Installation and Commissioning", "After-Sales Service / Warranty"] },
  { group: "Office - Sales, Marketing and Admin", office: "office", subs: ["Marketing and Advertising", "Website / Digital / SEO", "Business Travel", "Client Hospitality", "CA / Legal", "GST / Tax Payments", "Software / SaaS", "Bank Charges / OD Interest"] },
  { group: "Investments - Market", office: null, subs: ["Mutual Funds SIP", "Stocks / Equity", "NPS", "ELSS / Tax-Saving Funds"] },
  { group: "Investments - Fixed Income", office: null, subs: ["Fixed Deposit / RD", "PPF", "Savings Top-up", "Bonds / Debentures"] },
  { group: "Investments - Real Estate and Business", office: null, subs: ["Real Estate EMI / Down Payment", "Business Capital / Working Capital", "Equipment / Asset Purchase"] },
  { group: "Investments - Insurance and Protection", office: null, subs: ["Life Insurance Premium", "Term Plan Premium", "ULIP / Endowment Plan"] },
];

const [ownerEmail, ownerPassword, ownerName] = [
  process.env.OWNER_EMAIL,
  process.env.OWNER_PASSWORD,
  process.env.OWNER_NAME || "Owner",
];

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
  process.exit(1);
}

if (!ownerEmail || !ownerPassword) {
  console.error(
    "Usage: OWNER_EMAIL=you@example.com OWNER_PASSWORD='...' [OWNER_NAME='Full Name'] npm run seed"
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
);

async function main() {
  console.log(`Creating Owner auth user ${ownerEmail}...`);
  const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  });

  if (createErr) {
    console.error("Failed to create user:", createErr.message);
    process.exit(1);
  }

  const userId = userData.user.id;
  console.log(`Created auth user ${userId}`);

  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: ownerName, role: "owner" });

  if (profileErr) {
    console.error("Failed to create profile:", profileErr.message);
    process.exit(1);
  }
  console.log("Created profile row.");

  for (const group of CATEGORY_SEED) {
    const { data: category, error: catErr } = await supabase
      .from("categories")
      .upsert(
        {
          owner_id: userId,
          group_name: group.group,
          name: group.group,
          default_personal_or_office: group.office,
        },
        { onConflict: "owner_id,group_name,name" }
      )
      .select()
      .single();

    if (catErr) {
      console.error(`Failed to upsert category ${group.group}:`, catErr.message);
      continue;
    }

    for (const subName of group.subs) {
      const { error: subErr } = await supabase
        .from("subcategories")
        .upsert(
          { owner_id: userId, category_id: category.id, name: subName },
          { onConflict: "category_id,name" }
        );

      if (subErr) {
        console.error(`Failed to upsert subcategory ${subName}:`, subErr.message);
      }
    }
  }

  console.log(`Seeded ${CATEGORY_SEED.length} categories with subcategories.`);
  console.log("Done. Sign in with the Owner email/password you provided.");
}

main();
