import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

// ---- Create a test income source ----
await page.goto(BASE + "/income-sources");
await page.click('button:has-text("+ Add income source")');
await page.fill('input[name="name"]', "Test Plan Income Source");
await page.selectOption('select[name="income_type"]', "Salary");
await page.fill('input[name="expected_amount"]', "50000");
const today = new Date();
const dateStr = today.toISOString().slice(0, 10);
await page.fill('input[name="due_date"]', dateStr);
await page.click('button[type="submit"]:has-text("+ Add income source")');
await page.waitForTimeout(1000);
console.log("Income source created:", (await page.locator("text=Test Plan Income Source").count()) > 0);

// ---- Plans page: existing 5-bucket summary unchanged ----
await page.goto(BASE + "/plans");
await page.waitForLoadState("networkidle");
console.log("5-bucket summary still present (Personal Income row):", (await page.locator("text=Personal Income").count()) > 0);
console.log("Category breakdown heading present:", (await page.locator("text=/Category breakdown/").count()) > 0);
console.log("Income sources heading present:", (await page.locator("text=/Income sources —/").count()) > 0);
console.log("New income source appears in Plans:", (await page.locator("text=Test Plan Income Source").count()) > 0);

// ---- Set a category projection ----
const groceriesRow = page.locator("tr", { hasText: "Home - Groceries and Food" });
await groceriesRow.locator('input[type="number"]').fill("15000");
await page.click('button:has-text("Save category projections")');
await page.waitForTimeout(1000);

await page.goto(BASE + "/plans");
await page.waitForLoadState("networkidle");
const groceriesRowAfter = page.locator("tr", { hasText: "Home - Groceries and Food" });
const projectedVal = await groceriesRowAfter.locator('input[type="number"]').inputValue();
console.log("Category projection saved (15000):", projectedVal === "15000");

// ---- Add Entry: link an income transaction to the source ----
await page.goto(BASE + "/add-entry");
await page.waitForLoadState("networkidle");
await page.fill('input[name="transaction_date"]', dateStr);
await page.fill('input[name="amount"]', "48000");
await page.selectOption('select[name="type"]', "income");
await page.waitForTimeout(200);
console.log("Income source dropdown visible after selecting Income type:", (await page.locator('select[name="linked_commitment_id"]').count()) > 0);
await page.selectOption('select[name="linked_commitment_id"]', { label: "Test Plan Income Source" });
await page.selectOption('select[name="account_id"]', { index: 1 });
await page.fill('input[name="payee_payer"]', "Test Payer");
await page.click('button:has-text("Save entry")');
await page.waitForTimeout(1500);
console.log("After submit URL:", page.url());

// Confirm the provisional transaction (bank accounts default to provisional)
await page.goto(BASE + "/transactions");
await page.waitForLoadState("networkidle");
const testRow = page.locator("tr", { hasText: "Test Payer" });
const confirmBtn = testRow.locator('button:has-text("Confirm now")');
if ((await confirmBtn.count()) > 0) {
  await confirmBtn.click();
  await page.waitForTimeout(1000);
  console.log("Confirmed the test transaction");
} else {
  console.log("Transaction already confirmed or confirm button not found");
}

// ---- Plans page: income source Actual reflects the linked transaction ----
await page.goto(BASE + "/plans");
await page.waitForLoadState("networkidle");
const sourceRow = page.locator("tr", { hasText: "Test Plan Income Source" });
const actualText = await sourceRow.locator("a").textContent();
console.log("Income source Actual shows linked transaction (48000):", actualText.includes("48,000"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
