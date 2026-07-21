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

async function testEdit(url, rowText, newAmount) {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
  const row = page.locator("tr", { hasText: rowText }).first();
  await row.locator("text=Edit").click();
  await page.waitForTimeout(300);
  const amountInput = page.locator('input[name="expected_amount"]');
  const before = await amountInput.inputValue();
  await amountInput.fill(String(newAmount));
  await page.click('button:has-text("Save changes")');
  await page.waitForTimeout(1200);
  return before;
}

const insBefore = await testEdit("/insurance", "LIC Life Cover", 9999);
console.log(`Insurance edit — original was ${insBefore}, set to 9999`);

const utilBefore = await testEdit("/utilities", "Home Electricity", 2222);
console.log(`Utilities edit — original was ${utilBefore}, set to 2222`);

const subBefore = await testEdit("/subscriptions", "Netflix", 799);
console.log(`Subscriptions edit — original was ${subBefore}, set to 799`);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
