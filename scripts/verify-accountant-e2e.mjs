import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const BASE = "http://localhost:3000";
const TEST_EMAIL = "test-accountant-e2e@spacekrafters.com";
const TEST_PASSWORD = "TestAccountant123!";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

// Clean up any prior run
const { data: existingUsers } = await admin.auth.admin.listUsers();
const existing = existingUsers.users.find((u) => u.email === TEST_EMAIL);
if (existing) {
  await admin.from("profiles").delete().eq("id", existing.id);
  await admin.auth.admin.deleteUser(existing.id);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// ---- Owner: invite an accountant via the real UI ----
await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

await page.goto(BASE + "/users-access");
await page.waitForLoadState("networkidle");
await page.fill('input[name="full_name"]', "Test Accountant E2E");
await page.fill('input[name="email"]', TEST_EMAIL);
await page.fill('input[name="password"]', TEST_PASSWORD);
await page.click('button:has-text("+ Invite Accountant")');
await page.waitForTimeout(4000);
await page.goto(BASE + "/users-access");
await page.waitForLoadState("networkidle");

const ownerPageBody = await page.locator("body").textContent();
console.log("New accountant listed on Users & Access:", ownerPageBody.includes("Test Accountant E2E"));

// Sign out owner
await page.click('button:has-text("Sign out")');
await page.waitForURL("**/login");

// ---- Accountant: login and check nav scope ----
await page.fill('input[type="email"]', TEST_EMAIL);
await page.fill('input[type="password"]', TEST_PASSWORD);
await page.click('button:has-text("Sign in")');
await page.waitForTimeout(3000);
console.log("Accountant lands on:", page.url());
console.log("Accountant landing is /accounts (not /dashboard):", page.url().includes("/accounts"));

const navText = await page.locator("nav").textContent();
console.log("Nav shows Accounts:", navText.includes("Accounts"));
console.log("Nav shows Add Entry:", navText.includes("Add Entry"));
console.log("Nav shows Import Statements:", navText.includes("Import Statements"));
console.log("Nav shows Transactions:", navText.includes("Transactions"));
console.log("Nav does NOT show Dashboard:", !navText.includes("Dashboard"));
console.log("Nav does NOT show Investments:", !navText.includes("Investments"));
console.log("Nav does NOT show Reports:", !navText.includes("Reports"));
console.log("Nav does NOT show Settings:", !navText.includes("Settings"));
console.log("Nav does NOT show Users & Access:", !navText.includes("Users & Access"));
console.log("Sidebar shows 'accountant access':", (await page.locator("text=/accountant access/i").count()) > 0);

// ---- Direct URL attempts to blocked routes get redirected ----
await page.goto(BASE + "/dashboard");
await page.waitForLoadState("networkidle");
console.log("Direct /dashboard visit redirects away:", !page.url().endsWith("/dashboard"));

await page.goto(BASE + "/investments");
await page.waitForLoadState("networkidle");
console.log("Direct /investments visit redirects away:", !page.url().endsWith("/investments"));

await page.goto(BASE + "/users-access");
await page.waitForLoadState("networkidle");
console.log("Direct /users-access visit redirects away:", !page.url().endsWith("/users-access"));

// ---- Accountant can add a transaction, owned by the real owner ----
await page.goto(BASE + "/add-entry");
await page.waitForLoadState("networkidle");
await page.fill('input[name="transaction_date"]', "2026-07-21");
await page.fill('input[name="amount"]', "777");
await page.selectOption('select[name="account_id"]', { index: 1 });
await page.fill('input[name="payee_payer"]', "Accountant E2E Test Entry");
await page.click('button:has-text("Save entry")');
await page.waitForTimeout(1500);
console.log("After Add Entry submit, URL:", page.url());

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();

// ---- Verify in DB: transaction owned by the real Owner, not the accountant ----
const { data: ownerProfile } = await admin.from("profiles").select("id").eq("role", "owner").limit(1).single();
const { data: tx } = await admin.from("transactions").select("owner_id, amount").eq("payee_payer", "Accountant E2E Test Entry").single();
console.log("Transaction owner_id matches real Owner (not accountant):", tx?.owner_id === ownerProfile.id);

// Cleanup
if (tx) await admin.from("transactions").delete().eq("payee_payer", "Accountant E2E Test Entry");
const { data: acct } = await admin.from("profiles").select("id").eq("full_name", "Test Accountant E2E").maybeSingle();
if (acct) {
  await admin.from("profiles").delete().eq("id", acct.id);
  await admin.auth.admin.deleteUser(acct.id);
  console.log("Cleaned up test accountant");
}
