import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

async function testCommitmentDelete(url, addButtonText, nameField, extraFill, submitText) {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
  await page.click(`button:has-text("${addButtonText}")`);
  await page.fill(`input[name="${nameField}"]`, "ZZZ Delete Test Row");
  await extraFill();
  await page.click(`button[type="submit"]:has-text("${submitText}")`);
  await page.waitForTimeout(1000);

  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
  const created = (await page.locator("text=ZZZ Delete Test Row").count()) > 0;

  const row = page.locator("tr", { hasText: "ZZZ Delete Test Row" });
  await row.locator('button:has-text("Delete")').click();
  await page.waitForTimeout(1000);

  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
  const goneAfterDelete = (await page.locator("text=ZZZ Delete Test Row").count()) === 0;

  return { created, goneAfterDelete };
}

const insuranceResult = await testCommitmentDelete(
  "/insurance",
  "+ Add policy",
  "name",
  async () => {
    await page.selectOption('select[name="insurance_type"]', "Health");
    await page.fill('input[name="due_date"]', "2026-12-01");
  },
  "+ Add policy"
);
console.log("Insurance — created:", insuranceResult.created, "| deleted:", insuranceResult.goneAfterDelete);

const utilityResult = await testCommitmentDelete(
  "/utilities",
  "+ Add connection",
  "name",
  async () => {
    await page.selectOption('select[name="utility_type"]', "Water");
    await page.selectOption('select[name="location"]', "Home");
    await page.fill('input[name="due_date"]', "2026-12-01");
  },
  "+ Add connection"
);
console.log("Utilities — created:", utilityResult.created, "| deleted:", utilityResult.goneAfterDelete);

const subResult = await testCommitmentDelete(
  "/subscriptions",
  "+ Add subscription",
  "name",
  async () => {
    await page.fill('input[name="due_date"]', "2026-12-01");
  },
  "+ Add subscription"
);
console.log("Subscriptions — created:", subResult.created, "| deleted:", subResult.goneAfterDelete);

const incomeResult = await testCommitmentDelete(
  "/income-sources",
  "+ Add income source",
  "name",
  async () => {
    await page.selectOption('select[name="income_type"]', "Salary");
    await page.fill('input[name="due_date"]', "2026-12-01");
  },
  "+ Add income source"
);
console.log("Income Sources — created:", incomeResult.created, "| deleted:", incomeResult.goneAfterDelete);

// Investments (no add-form modal opening pattern check needed — uses tab param)
await page.goto(BASE + "/investments?type=other");
await page.waitForLoadState("networkidle");
await page.click('button:has-text("+ Add Investment")');
await page.fill('input[name="name"]', "ZZZ Delete Test Row");
await page.fill('input[name="invested_amount"]', "1000");
await page.click('button[type="submit"]:has-text("+ Add Investment")');
await page.waitForTimeout(1000);
await page.goto(BASE + "/investments?type=other");
await page.waitForLoadState("networkidle");
const invCreated = (await page.locator("text=ZZZ Delete Test Row").count()) > 0;
const invRow = page.locator("tr", { hasText: "ZZZ Delete Test Row" });
await invRow.locator('button:has-text("Delete")').click();
await page.waitForTimeout(1000);
await page.goto(BASE + "/investments?type=other");
await page.waitForLoadState("networkidle");
const invGone = (await page.locator("text=ZZZ Delete Test Row").count()) === 0;
console.log("Investments — created:", invCreated, "| deleted:", invGone);

console.log("Console pageerrors:", errors.length ? errors : "none");
await browser.close();
