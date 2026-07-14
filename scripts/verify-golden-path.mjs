import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OWNER_EMAIL = "owner@spacekrafters.com";
const OWNER_PASSWORD = "Xx7Aa!F6BzxyYYnELe";

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  // 1. Unauthenticated root should redirect to /login
  await page.goto(BASE + "/");
  await page.waitForURL("**/login");
  console.log("OK: unauthenticated redirect to /login");

  // 2. Sign in
  await page.fill('input[type="email"]', OWNER_EMAIL);
  await page.fill('input[type="password"]', OWNER_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("OK: signed in, redirected to /dashboard");
  await page.screenshot({ path: "scripts/.verify-screens/01-dashboard-empty.png" });

  // 3. Create an account
  await page.goto(BASE + "/accounts");
  await page.fill('input[name="name"]', "HDFC Personal");
  await page.selectOption('select[name="type"]', "bank");
  await page.selectOption('select[name="personal_or_office"]', "personal");
  await page.fill('input[name="opening_balance"]', "50000");
  await page.click('button:has-text("Add account")');
  await page.waitForSelector("text=HDFC Personal");
  console.log("OK: account created");
  await page.screenshot({ path: "scripts/.verify-screens/02-accounts.png" });

  // 4. Add a manual transaction
  await page.goto(BASE + "/add-entry");
  await page.fill('input[name="amount"]', "1250");
  await page.selectOption('select[name="type"]', "expense");
  await page.selectOption('select[name="personal_or_office"]', "personal");
  await page.selectOption('select[name="account_id"]', { label: "HDFC Personal" });
  await page.fill('input[name="payee_payer"]', "Swiggy");
  await page.click('button:has-text("Save entry")');
  await page.waitForURL("**/transactions", { timeout: 15000 });
  await page.waitForSelector("text=Swiggy");
  console.log("OK: transaction saved, visible in Transactions list");
  await page.screenshot({ path: "scripts/.verify-screens/03-transactions.png" });

  // 5. Dashboard reflects the new transaction
  await page.goto(BASE + "/dashboard");
  await page.waitForSelector("text=Expense this month");
  const bodyText = await page.textContent("body");
  if (!bodyText.includes("₹1,250") && !bodyText.includes("1,250")) {
    throw new Error("Dashboard does not show updated expense total");
  }
  console.log("OK: dashboard reflects new expense total");
  await page.screenshot({ path: "scripts/.verify-screens/04-dashboard-updated.png" });

  console.log("\nConsole errors captured:", consoleErrors.length ? consoleErrors : "none");
  console.log("\nGOLDEN PATH VERIFIED");
} catch (err) {
  console.error("VERIFICATION FAILED:", err);
  await page.screenshot({ path: "scripts/.verify-screens/failure.png" });
  process.exitCode = 1;
} finally {
  await browser.close();
}
