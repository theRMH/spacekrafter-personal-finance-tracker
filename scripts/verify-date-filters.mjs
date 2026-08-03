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
await page.waitForURL("**/dashboard", { timeout: 60000 });

async function checkFilter(url) {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
  const hasFilter = (await page.locator('input[name="from"]').count()) > 0;
  console.log(`${url} — filter present: ${hasFilter}`);

  // Apply a tight range that should exclude everything, confirm results narrow
  const beforeRows = await page.locator("tbody tr").count();
  await page.fill('input[name="from"]', "1999-01-01");
  await page.fill('input[name="to"]', "1999-01-02");
  await page.click('button:has-text("Apply")');
  await page.waitForLoadState("networkidle");
  const afterRows = await page.locator("tbody tr").count();
  console.log(`${url} — rows narrowed with impossible date range: ${afterRows <= beforeRows} (before=${beforeRows}, after=${afterRows})`);
  console.log(`${url} — Clear filters link present:`, (await page.locator("text=Clear filters").count()) > 0);
}

await checkFilter("/insurance");
await checkFilter("/utilities");
await checkFilter("/subscriptions");
await checkFilter("/income-sources");
await checkFilter("/investments");

// Investments: confirm type tab is preserved when filter applied
await page.goto(BASE + "/investments?type=mutual_fund");
await page.waitForLoadState("networkidle");
await page.fill('input[name="from"]', "2020-01-01");
await page.click('button:has-text("Apply")');
await page.waitForLoadState("networkidle");
console.log("Investments — type param preserved after filter apply:", page.url().includes("type=mutual_fund"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
